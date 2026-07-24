import {
  ClampToEdgeWrapping,
  DataTexture,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  RGFormat,
} from 'three';
import {TERRAIN_MATERIAL_CONFIG, TERRAIN_MESH_CONFIG} from '@/config/scene';
import type {HeightGrid} from './bake';

const SHADOW_STEPS = 10;
const SHADOW_SOFT_MIN = -0.04;
const SHADOW_SOFT_MAX = 0.18;

export type TerrainLightingSettings = {
  elevation: number;
  lightFalloff: number;
  lightIntensity: number;
  lightX: number;
  lightY: number;
  lightZ: number;
  light2Falloff: number;
  light2Intensity: number;
  light2X: number;
  light2Y: number;
  light2Z: number;
  seaLevel: number;
  shadowBias: number;
  shadowStrength: number;
};

type HalfFloatGradientImage = {
  data: Uint16Array;
  height: number;
  width: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(minimum: number, maximum: number, value: number) {
  const normalized = clamp((value - minimum) / (maximum - minimum), 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
}

/** Matches WebGL's linear, clamp-to-edge sampling for a single-channel texture. */
function sampleRawHeight(grid: HeightGrid, u: number, v: number) {
  const textureX = u * grid.width - 0.5;
  const textureY = v * grid.height - 0.5;
  const floorX = Math.floor(textureX);
  const floorY = Math.floor(textureY);
  const xMix = textureX - floorX;
  const yMix = textureY - floorY;
  const x0 = clamp(floorX, 0, grid.width - 1);
  const y0 = clamp(floorY, 0, grid.height - 1);
  const x1 = clamp(floorX + 1, 0, grid.width - 1);
  const y1 = clamp(floorY + 1, 0, grid.height - 1);
  const topLeft = grid.data[y0 * grid.width + x0];
  const topRight = grid.data[y0 * grid.width + x1];
  const bottomLeft = grid.data[y1 * grid.width + x0];
  const bottomRight = grid.data[y1 * grid.width + x1];
  const top = topLeft + (topRight - topLeft) * xMix;
  const bottom = bottomLeft + (bottomRight - bottomLeft) * xMix;
  return top + (bottom - top) * yMix;
}

function processHeight(raw: number, seaLevel: number) {
  const curved = Math.pow(Math.max(raw, 0), TERRAIN_MATERIAL_CONFIG.contrast);
  return clamp((curved - seaLevel) / Math.max(1 - seaLevel, 0.0001), 0, 1);
}

function sampleProcessedHeight(grid: HeightGrid, u: number, v: number, seaLevel: number) {
  return processHeight(sampleRawHeight(grid, u, v), seaLevel);
}

/** Matches the shader's linearly filtered RG16F gradient lookup. */
function sampleGradient(gradientMap: DataTexture, u: number, v: number) {
  const image = gradientMap.image as HalfFloatGradientImage;
  const textureX = u * image.width - 0.5;
  const textureY = v * image.height - 0.5;
  const floorX = Math.floor(textureX);
  const floorY = Math.floor(textureY);
  const xMix = textureX - floorX;
  const yMix = textureY - floorY;
  const x0 = clamp(floorX, 0, image.width - 1);
  const y0 = clamp(floorY, 0, image.height - 1);
  const x1 = clamp(floorX + 1, 0, image.width - 1);
  const y1 = clamp(floorY + 1, 0, image.height - 1);

  const channel = (x: number, y: number, offset: number) => (
    DataUtils.fromHalfFloat(image.data[(y * image.width + x) * 2 + offset])
  );
  const interpolate = (offset: number) => {
    const top = channel(x0, y0, offset)
      + (channel(x1, y0, offset) - channel(x0, y0, offset)) * xMix;
    const bottom = channel(x0, y1, offset)
      + (channel(x1, y1, offset) - channel(x0, y1, offset)) * xMix;
    return top + (bottom - top) * yMix;
  };

  return [interpolate(0), interpolate(1)] as const;
}

/**
 * Reconstructs the receiver height produced by PlaneGeometry's two triangles
 * per cell. This matches the interpolated vWorldPos used by the old fragment
 * shader more closely than sampling the displacement texture directly.
 */
function sampleReceiverHeight(
  grid: HeightGrid,
  u: number,
  v: number,
  elevation: number,
  seaLevel: number,
) {
  const segments = TERRAIN_MESH_CONFIG.segments;
  const scaledX = clamp(u, 0, 1) * segments;
  const scaledY = clamp(v, 0, 1) * segments;
  const cellX = Math.min(Math.floor(scaledX), segments - 1);
  const cellY = Math.min(Math.floor(scaledY), segments - 1);
  const xMix = scaledX - cellX;
  const yMix = scaledY - cellY;
  const u0 = cellX / segments;
  const v0 = cellY / segments;
  const u1 = (cellX + 1) / segments;
  const v1 = (cellY + 1) / segments;
  const bottomLeft = sampleProcessedHeight(grid, u0, v0, seaLevel);
  const topRight = sampleProcessedHeight(grid, u1, v1, seaLevel);
  let height: number;

  if (yMix >= xMix) {
    const topLeft = sampleProcessedHeight(grid, u0, v1, seaLevel);
    height = (
      bottomLeft * (1 - yMix)
      + topLeft * (yMix - xMix)
      + topRight * xMix
    );
  } else {
    const bottomRight = sampleProcessedHeight(grid, u1, v0, seaLevel);
    height = (
      bottomLeft * (1 - xMix)
      + bottomRight * (xMix - yMix)
      + topRight * yMix
    );
  }

  return TERRAIN_MESH_CONFIG.position[1] + height * elevation;
}

function bakeLightVisibility(
  grid: HeightGrid,
  receiverU: number,
  receiverV: number,
  receiverY: number,
  sourceX: number,
  sourceY: number,
  sourceZ: number,
  elevation: number,
  seaLevel: number,
  shadowBias: number,
) {
  const planeSize = TERRAIN_MESH_CONFIG.planeSize;
  const sourceU = sourceX / planeSize + 0.5;
  const sourceV = 0.5 - sourceZ / planeSize;
  let visibility = 1;

  for (let step = 1; step < SHADOW_STEPS; step++) {
    const progress = step / SHADOW_STEPS;
    const sampleU = receiverU + (sourceU - receiverU) * progress;
    const sampleV = receiverV + (sourceV - receiverV) * progress;
    const terrainY = (
      TERRAIN_MESH_CONFIG.position[1]
      + sampleProcessedHeight(grid, sampleU, sampleV, seaLevel) * elevation
    );
    const rayY = receiverY + shadowBias + (sourceY - receiverY - shadowBias) * progress;
    const sampleVisibility = smoothstep(
      SHADOW_SOFT_MIN,
      SHADOW_SOFT_MAX,
      rayY - terrainY,
    );
    visibility = Math.min(visibility, sampleVisibility);
  }

  return visibility;
}

/** Bakes both static point lights, terrain shadows, normals, and slope shading. */
export function bakeTerrainLightingMap(
  grid: HeightGrid,
  gradientMap: DataTexture,
  settings: TerrainLightingSettings,
) {
  const data = new Uint16Array(grid.width * grid.height * 2);
  const {
    elevation,
    lightFalloff,
    lightIntensity,
    lightX,
    lightY,
    lightZ,
    light2Falloff,
    light2Intensity,
    light2X,
    light2Y,
    light2Z,
    seaLevel,
    shadowBias,
    shadowStrength,
  } = settings;
  const planeSize = TERRAIN_MESH_CONFIG.planeSize;

  for (let y = 0; y < grid.height; y++) {
    const v = (y + 0.5) / grid.height;
    for (let x = 0; x < grid.width; x++) {
      const u = (x + 0.5) / grid.width;
      const receiverY = sampleReceiverHeight(grid, u, v, elevation, seaLevel);
      const receiverX = (u - 0.5) * planeSize;
      const receiverZ = (0.5 - v) * planeSize;
      const [gradientX, gradientY] = sampleGradient(gradientMap, u, v);
      const gradientScale = elevation / Math.max(1 - seaLevel, 0.0001);
      const scaledX = gradientX * gradientScale;
      const scaledY = gradientY * gradientScale;
      const normalLength = Math.hypot(scaledX, 1, scaledY);
      const normalX = -scaledX / normalLength;
      const normalY = 1 / normalLength;
      const normalZ = scaledY / normalLength;
      const slope = clamp(
        Math.hypot(scaledX, scaledY) * (2 * planeSize / 512) * 0.1,
        0,
        1,
      );
      const slopeShade = 1 - slope * 0.3;
      const primaryVisibility = bakeLightVisibility(
        grid,
        u,
        v,
        receiverY,
        lightX,
        lightY,
        lightZ,
        elevation,
        seaLevel,
        shadowBias,
      );
      const secondaryVisibility = bakeLightVisibility(
        grid,
        u,
        v,
        receiverY,
        light2X,
        light2Y,
        light2Z,
        elevation,
        seaLevel,
        shadowBias,
      );

      const contribution = (
        sourceX: number,
        sourceY: number,
        sourceZ: number,
        intensity: number,
        falloff: number,
        visibility: number,
      ) => {
        const toLightX = sourceX - receiverX;
        const toLightY = sourceY - receiverY;
        const toLightZ = sourceZ - receiverZ;
        const distance = Math.max(Math.hypot(toLightX, toLightY, toLightZ), 0.0001);
        const diffuse = Math.max(
          (normalX * toLightX + normalY * toLightY + normalZ * toLightZ) / distance,
          0,
        );
        const attenuation = 1 / (0.05 + falloff * distance * distance);
        const shadow = 1 + (visibility - 1) * shadowStrength;
        return intensity * attenuation * diffuse * shadow * slopeShade;
      };
      const primary = contribution(
        lightX,
        lightY,
        lightZ,
        lightIntensity,
        lightFalloff,
        primaryVisibility,
      );
      const secondary = contribution(
        light2X,
        light2Y,
        light2Z,
        light2Intensity,
        light2Falloff,
        secondaryVisibility,
      );
      const index = (y * grid.width + x) * 2;
      data[index] = DataUtils.toHalfFloat(primary);
      data[index + 1] = DataUtils.toHalfFloat(secondary);
    }
  }

  const texture = new DataTexture(
    data,
    grid.width,
    grid.height,
    RGFormat,
    HalfFloatType,
  );
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  texture.name = 'Terrain.StaticLighting';
  return texture;
}
