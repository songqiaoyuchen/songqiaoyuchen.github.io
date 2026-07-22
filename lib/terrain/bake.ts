import {
  ClampToEdgeWrapping,
  DataTexture,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  RedFormat,
  RGFormat,
} from 'three';
import {TERRAIN_MATERIAL_CONFIG, TERRAIN_MESH_CONFIG} from '@/config/scene';
import {gaussianBlur} from './blur';

export interface HeightmapImage {
  data: Uint16Array | Float32Array;
  width: number;
  height: number;
}

export interface HeightGrid {
  data: Float32Array;
  width: number;
  height: number;
}

export interface TerrainMaps {
  displacementMap: DataTexture;
  gradientMap: DataTexture;
  shellBase: HeightGrid;
}

const BAKE_CACHE = new WeakMap<HeightmapImage['data'], TerrainMaps>();

export function toHeightmapImage(input: unknown): HeightmapImage {
  const {data, width, height} = input as HeightmapImage;
  const validData = data instanceof Uint16Array || data instanceof Float32Array;
  const validWidth = typeof width === 'number' && Number.isFinite(width) && width > 0;
  const validHeight = typeof height === 'number' && Number.isFinite(height) && height > 0;
  if (!validData || !validWidth || !validHeight) {
    throw new Error('Invalid EXR image: expected typed array data and positive dimensions');
  }
  return {data, width, height};
}

function toSrgb(value: number) {
  return value <= 0.0031308
    ? value * 12.92
    : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
}

function decodeHeights({data, width, height}: HeightmapImage) {
  const stride = data.length / (width * height);
  const isHalfFloat = data instanceof Uint16Array;
  const heights = new Float32Array(width * height);
  for (let index = 0; index < heights.length; index++) {
    const raw = data[index * stride];
    heights[index] = toSrgb(isHalfFloat ? DataUtils.fromHalfFloat(raw) : raw);
  }
  return heights;
}

function bakeGradientMap(heights: Float32Array, width: number, height: number) {
  const curved = new Float32Array(width * height);
  for (let index = 0; index < curved.length; index++) {
    curved[index] = Math.pow(heights[index], TERRAIN_MATERIAL_CONFIG.contrast);
  }

  const texelWorldSize = TERRAIN_MESH_CONFIG.planeSize / width;
  const gradient = new Uint16Array(width * height * 2);
  for (let y = 0; y < height; y++) {
    const downRow = Math.max(y - 1, 0) * width;
    const upRow = Math.min(y + 1, height - 1) * width;
    const row = y * width;
    const ySpan = (upRow - downRow) / width;
    for (let x = 0; x < width; x++) {
      const left = Math.max(x - 1, 0);
      const right = Math.min(x + 1, width - 1);
      const index = (row + x) * 2;
      gradient[index] = DataUtils.toHalfFloat(
        (curved[row + right] - curved[row + left]) / ((right - left) * texelWorldSize),
      );
      gradient[index + 1] = DataUtils.toHalfFloat(
        (curved[upRow + x] - curved[downRow + x]) / (ySpan * texelWorldSize),
      );
    }
  }
  return new DataTexture(gradient, width, height, RGFormat, HalfFloatType);
}

function bakeDisplacementMap(
  heights: Float32Array,
  width: number,
  height: number,
) {
  const factor = Math.max(1, Math.round(width / (2 * TERRAIN_MESH_CONFIG.segments)));
  const blurred = gaussianBlur(heights, width, height, 3 * factor);
  const outputWidth = Math.max(1, Math.floor(width / factor));
  const outputHeight = Math.max(1, Math.floor(height / factor));
  const gridData = new Float32Array(outputWidth * outputHeight);
  const textureData = new Uint16Array(outputWidth * outputHeight);

  for (let y = 0; y < outputHeight; y++) {
    for (let x = 0; x < outputWidth; x++) {
      let sum = 0;
      for (let blockY = 0; blockY < factor; blockY++) {
        const row = (y * factor + blockY) * width;
        for (let blockX = 0; blockX < factor; blockX++) {
          sum += blurred[row + x * factor + blockX];
        }
      }
      const average = sum / (factor * factor);
      const index = y * outputWidth + x;
      gridData[index] = average;
      textureData[index] = DataUtils.toHalfFloat(average);
    }
  }
  return {
    texture: new DataTexture(
      textureData,
      outputWidth,
      outputHeight,
      RedFormat,
      HalfFloatType,
    ),
    grid: {data: gridData, width: outputWidth, height: outputHeight},
  };
}

export function bakeTerrainMaps(image: HeightmapImage): TerrainMaps {
  const cached = BAKE_CACHE.get(image.data);
  if (cached) return cached;

  const heights = decodeHeights(image);
  const gradientMap = bakeGradientMap(heights, image.width, image.height);
  const displacement = bakeDisplacementMap(heights, image.width, image.height);
  for (const texture of [gradientMap, displacement.texture]) {
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.wrapS = ClampToEdgeWrapping;
    texture.wrapT = ClampToEdgeWrapping;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
  }
  const maps = {
    displacementMap: displacement.texture,
    gradientMap,
    shellBase: displacement.grid,
  };
  BAKE_CACHE.set(image.data, maps);
  return maps;
}
