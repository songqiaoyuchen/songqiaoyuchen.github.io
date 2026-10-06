// Bakes the terrain heightmap into compressed artifacts (shell, displacement, lighting, contours) + manifest.
// npm run bake:terrain writes them; --check (prebuild) fails when config or source changed since the bake.
import {createHash} from 'node:crypto';
import {mkdir, readFile, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync, gzipSync} from 'node:zlib';
import {DataUtils} from 'three';
import {EXRLoader} from 'three/addons/loaders/EXRLoader.js';
import {
  TERRAIN_MATERIAL_CONFIG,
  TERRAIN_MESH_CONFIG,
} from '../../config/scene/terrain.ts';
import {CONTOUR_CONFIG} from '../../config/scene/contours.ts';
import {packContourTubeBuffers} from '../../lib/terrain/contourArtifact.ts';
import {extractIsolines} from '../../lib/terrain/isolines.ts';
import {buildContourTubeBuffers} from '../../lib/terrain/lineTubeBuffers.ts';
import {bakeShellGrid} from '../../lib/terrain/shell.ts';

const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, 'public/textures/terrain/heightmap.exr');
const OUTPUT_DIRECTORY = path.join(ROOT, 'public/textures/terrain/baked');
const MANIFEST_PATH = path.join(OUTPUT_DIRECTORY, 'manifest.json');
const SHADOW_STEPS = 10;
const SHADOW_SOFT_MIN = -0.04;
const SHADOW_SOFT_MAX = 0.18;

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function stableConfig() {
  return {
    mesh: {
      planeSize: TERRAIN_MESH_CONFIG.planeSize,
      position: TERRAIN_MESH_CONFIG.position,
      segments: TERRAIN_MESH_CONFIG.segments,
    },
    material: {
      contrast: TERRAIN_MATERIAL_CONFIG.contrast,
      elevation: TERRAIN_MATERIAL_CONFIG.elevation,
      lightFalloff: TERRAIN_MATERIAL_CONFIG.lightFalloff,
      lightIntensity: TERRAIN_MATERIAL_CONFIG.lightIntensity,
      lightX: TERRAIN_MATERIAL_CONFIG.lightX,
      lightY: TERRAIN_MATERIAL_CONFIG.lightY,
      lightZ: TERRAIN_MATERIAL_CONFIG.lightZ,
      light2Falloff: TERRAIN_MATERIAL_CONFIG.light2Falloff,
      light2Intensity: TERRAIN_MATERIAL_CONFIG.light2Intensity,
      light2X: TERRAIN_MATERIAL_CONFIG.light2X,
      light2Y: TERRAIN_MATERIAL_CONFIG.light2Y,
      light2Z: TERRAIN_MATERIAL_CONFIG.light2Z,
      seaLevel: TERRAIN_MATERIAL_CONFIG.seaLevel,
      shadowBias: TERRAIN_MATERIAL_CONFIG.shadowBias,
      shadowStrength: TERRAIN_MATERIAL_CONFIG.shadowStrength,
    },
    shadows: {
      steps: SHADOW_STEPS,
      softMin: SHADOW_SOFT_MIN,
      softMax: SHADOW_SOFT_MAX,
    },
    contours: contourBuildOptions(),
  };
}

function contourBuildOptions() {
  return {
    chaikinIterations: CONTOUR_CONFIG.chaikinIterations,
    contrast: TERRAIN_MATERIAL_CONFIG.contrast,
    downsample: CONTOUR_CONFIG.downsample,
    levels: CONTOUR_CONFIG.levels,
    majorEvery: CONTOUR_CONFIG.majorEvery,
    majorMinHeight: CONTOUR_CONFIG.majorMinHeight,
    minLength: CONTOUR_CONFIG.minLength,
    planeSize: TERRAIN_MESH_CONFIG.planeSize,
    rdpEpsilon: CONTOUR_CONFIG.rdpEpsilon,
    resampleSpacing: CONTOUR_CONFIG.resampleSpacing,
    seaLevel: TERRAIN_MATERIAL_CONFIG.seaLevel,
    shadowChance: CONTOUR_CONFIG.shadowChance,
    shadowOffset: CONTOUR_CONFIG.shadowOffset,
    smoothFactor: CONTOUR_CONFIG.smoothFactor,
    smoothIterations: CONTOUR_CONFIG.smoothIterations,
    spacingJitter: CONTOUR_CONFIG.spacingJitter,
  };
}

function typedArrayBuffer(array) {
  return Buffer.from(array.buffer, array.byteOffset, array.byteLength);
}

function toSrgb(value) {
  return value <= 0.0031308
    ? value * 12.92
    : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
}

function decodeHeights(data, width, height) {
  const stride = data.length / (width * height);
  const heights = new Float32Array(width * height);
  for (let index = 0; index < heights.length; index++) {
    heights[index] = toSrgb(DataUtils.fromHalfFloat(data[index * stride]));
  }
  return heights;
}

function boxBlur(source, width, height, horizontal, radius) {
  const output = new Float32Array(width * height);
  const normalization = 1 / (radius * 2 + 1);
  if (horizontal) {
    for (let y = 0; y < height; y++) {
      const row = y * width;
      let sum = 0;
      for (let x = -radius; x <= radius; x++) {
        sum += source[row + Math.min(width - 1, Math.max(0, x))];
      }
      for (let x = 0; x < width; x++) {
        output[row + x] = sum * normalization;
        sum += source[row + Math.min(width - 1, x + radius + 1)]
          - source[row + Math.max(0, x - radius)];
      }
    }
  } else {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let y = -radius; y <= radius; y++) {
        sum += source[Math.min(height - 1, Math.max(0, y)) * width + x];
      }
      for (let y = 0; y < height; y++) {
        output[y * width + x] = sum * normalization;
        sum += source[Math.min(height - 1, y + radius + 1) * width + x]
          - source[Math.max(0, y - radius) * width + x];
      }
    }
  }
  return output;
}

function gaussianBlur(heights, width, height, sigma) {
  const radius = Math.max(1, Math.round((-1 + Math.sqrt(1 + 4 * sigma * sigma)) / 2));
  let field = heights;
  for (let pass = 0; pass < 3; pass++) {
    field = boxBlur(field, width, height, true, radius);
    field = boxBlur(field, width, height, false, radius);
  }
  return field;
}

function bakeGradientMap(heights, width, height) {
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
  return gradient;
}

function bakeDisplacement(heights, width, height) {
  const factor = Math.max(1, Math.round(width / (2 * TERRAIN_MESH_CONFIG.segments)));
  const blurred = gaussianBlur(heights, width, height, 3 * factor);
  const outputWidth = Math.max(1, Math.floor(width / factor));
  const outputHeight = Math.max(1, Math.floor(height / factor));
  const shell = new Float32Array(outputWidth * outputHeight);
  const displacement = new Uint16Array(outputWidth * outputHeight);

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
      shell[index] = average;
      displacement[index] = DataUtils.toHalfFloat(average);
    }
  }
  return {displacement, shell, width: outputWidth, height: outputHeight};
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(minimum, maximum, value) {
  const normalized = clamp((value - minimum) / (maximum - minimum), 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
}

function sampleRawHeight(grid, u, v) {
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

function processHeight(raw, seaLevel) {
  const curved = Math.pow(Math.max(raw, 0), TERRAIN_MATERIAL_CONFIG.contrast);
  return clamp((curved - seaLevel) / Math.max(1 - seaLevel, 0.0001), 0, 1);
}

function sampleProcessedHeight(grid, u, v, seaLevel) {
  return processHeight(sampleRawHeight(grid, u, v), seaLevel);
}

function sampleGradient(gradient, width, height, u, v) {
  const textureX = u * width - 0.5;
  const textureY = v * height - 0.5;
  const floorX = Math.floor(textureX);
  const floorY = Math.floor(textureY);
  const xMix = textureX - floorX;
  const yMix = textureY - floorY;
  const x0 = clamp(floorX, 0, width - 1);
  const y0 = clamp(floorY, 0, height - 1);
  const x1 = clamp(floorX + 1, 0, width - 1);
  const y1 = clamp(floorY + 1, 0, height - 1);
  const channel = (x, y, offset) => (
    DataUtils.fromHalfFloat(gradient[(y * width + x) * 2 + offset])
  );
  const interpolate = (offset) => {
    const top = channel(x0, y0, offset)
      + (channel(x1, y0, offset) - channel(x0, y0, offset)) * xMix;
    const bottom = channel(x0, y1, offset)
      + (channel(x1, y1, offset) - channel(x0, y1, offset)) * xMix;
    return top + (bottom - top) * yMix;
  };
  return [interpolate(0), interpolate(1)];
}

function sampleReceiverHeight(grid, u, v, elevation, seaLevel) {
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
  let height;
  if (yMix >= xMix) {
    const topLeft = sampleProcessedHeight(grid, u0, v1, seaLevel);
    height = bottomLeft * (1 - yMix) + topLeft * (yMix - xMix) + topRight * xMix;
  } else {
    const bottomRight = sampleProcessedHeight(grid, u1, v0, seaLevel);
    height = bottomLeft * (1 - xMix) + bottomRight * (xMix - yMix) + topRight * yMix;
  }
  return TERRAIN_MESH_CONFIG.position[1] + height * elevation;
}

function bakeLightVisibility(
  grid,
  receiverU,
  receiverV,
  receiverY,
  sourceX,
  sourceY,
  sourceZ,
  elevation,
  seaLevel,
  shadowBias,
) {
  const planeSize = TERRAIN_MESH_CONFIG.planeSize;
  const sourceU = sourceX / planeSize + 0.5;
  const sourceV = 0.5 - sourceZ / planeSize;
  let visibility = 1;
  for (let step = 1; step < SHADOW_STEPS; step++) {
    const progress = step / SHADOW_STEPS;
    const sampleU = receiverU + (sourceU - receiverU) * progress;
    const sampleV = receiverV + (sourceV - receiverV) * progress;
    const terrainY = TERRAIN_MESH_CONFIG.position[1]
      + sampleProcessedHeight(grid, sampleU, sampleV, seaLevel) * elevation;
    const rayY = receiverY + shadowBias + (sourceY - receiverY - shadowBias) * progress;
    visibility = Math.min(
      visibility,
      smoothstep(SHADOW_SOFT_MIN, SHADOW_SOFT_MAX, rayY - terrainY),
    );
  }
  return visibility;
}

function bakeStaticLighting(grid, gradient, gradientWidth, gradientHeight) {
  const data = new Uint16Array(grid.width * grid.height * 2);
  const settings = TERRAIN_MATERIAL_CONFIG;
  const planeSize = TERRAIN_MESH_CONFIG.planeSize;

  for (let y = 0; y < grid.height; y++) {
    const v = (y + 0.5) / grid.height;
    for (let x = 0; x < grid.width; x++) {
      const u = (x + 0.5) / grid.width;
      const receiverY = sampleReceiverHeight(
        grid,
        u,
        v,
        settings.elevation,
        settings.seaLevel,
      );
      const receiverX = (u - 0.5) * planeSize;
      const receiverZ = (0.5 - v) * planeSize;
      const [gradientX, gradientY] = sampleGradient(
        gradient,
        gradientWidth,
        gradientHeight,
        u,
        v,
      );
      const gradientScale = settings.elevation / Math.max(1 - settings.seaLevel, 0.0001);
      const scaledX = gradientX * gradientScale;
      const scaledY = gradientY * gradientScale;
      const normalLength = Math.hypot(scaledX, 1, scaledY);
      const normalX = -scaledX / normalLength;
      const normalY = 1 / normalLength;
      const normalZ = scaledY / normalLength;
      const slope = clamp(Math.hypot(scaledX, scaledY) * (2 * planeSize / 512) * 0.1, 0, 1);
      const slopeShade = 1 - slope * 0.3;
      const primaryVisibility = bakeLightVisibility(
        grid,
        u,
        v,
        receiverY,
        settings.lightX,
        settings.lightY,
        settings.lightZ,
        settings.elevation,
        settings.seaLevel,
        settings.shadowBias,
      );
      const secondaryVisibility = bakeLightVisibility(
        grid,
        u,
        v,
        receiverY,
        settings.light2X,
        settings.light2Y,
        settings.light2Z,
        settings.elevation,
        settings.seaLevel,
        settings.shadowBias,
      );
      const contribution = (sourceX, sourceY, sourceZ, intensity, falloff, visibility) => {
        const toLightX = sourceX - receiverX;
        const toLightY = sourceY - receiverY;
        const toLightZ = sourceZ - receiverZ;
        const distance = Math.max(Math.hypot(toLightX, toLightY, toLightZ), 0.0001);
        const diffuse = Math.max(
          (normalX * toLightX + normalY * toLightY + normalZ * toLightZ) / distance,
          0,
        );
        const attenuation = 1 / (0.05 + falloff * distance * distance);
        const shadow = 1 + (visibility - 1) * settings.shadowStrength;
        return intensity * attenuation * diffuse * shadow * slopeShade;
      };
      const index = (y * grid.width + x) * 2;
      data[index] = DataUtils.toHalfFloat(contribution(
        settings.lightX,
        settings.lightY,
        settings.lightZ,
        settings.lightIntensity,
        settings.lightFalloff,
        primaryVisibility,
      ));
      data[index + 1] = DataUtils.toHalfFloat(contribution(
        settings.light2X,
        settings.light2Y,
        settings.light2Z,
        settings.light2Intensity,
        settings.light2Falloff,
        secondaryVisibility,
      ));
    }
  }
  return data;
}

async function artifactExists(artifact) {
  try {
    const details = await stat(path.join(OUTPUT_DIRECTORY, artifact.file));
    return details.size === artifact.compressedByteLength;
  } catch {
    return false;
  }
}

async function checkManifest(sourceHash, configHash) {
  try {
    const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
    const artifacts = Object.values(manifest.artifacts ?? {});
    const filesExist = (await Promise.all(artifacts.map(artifactExists))).every(Boolean);
    const metadataIsCurrent = manifest.version === 2
      && manifest.sourceHash === sourceHash
      && manifest.configHash === configHash
      && artifacts.length === 5
      && manifest.artifacts.contours?.format === 'contour-v1'
      && filesExist;
    if (!metadataIsCurrent) return false;
    return validateContourArtifact(manifest);
  } catch {
    return false;
  }
}

async function validateContourArtifact(manifest) {
  const shellArtifact = manifest.artifacts.shell;
  const shellCompressed = await readFile(path.join(OUTPUT_DIRECTORY, shellArtifact.file));
  const shellRaw = gunzipSync(shellCompressed);
  if (shellRaw.byteLength !== shellArtifact.byteLength) return false;
  const shellData = new Float32Array(
    shellRaw.buffer.slice(shellRaw.byteOffset, shellRaw.byteOffset + shellRaw.byteLength),
  );
  const options = contourBuildOptions();
  const shell = bakeShellGrid(
    {data: shellData, width: shellArtifact.width, height: shellArtifact.height},
    options.smoothIterations,
    options.smoothFactor,
  );
  const expected = packContourTubeBuffers(buildContourTubeBuffers(
    extractIsolines(shell, options),
  ));

  const artifact = manifest.artifacts.contours;
  const compressed = await readFile(path.join(OUTPUT_DIRECTORY, artifact.file));
  const raw = gunzipSync(compressed);
  return raw.byteLength === artifact.byteLength
    && raw.equals(Buffer.from(expected.buffer))
    && JSON.stringify(artifact.buffers) === JSON.stringify(expected.layout);
}

async function writeContourArtifact(buffers) {
  const packed = packContourTubeBuffers(buffers);
  const raw = Buffer.from(packed.buffer);
  const contentHash = hash(raw).slice(0, 16);
  const file = `contours.${contentHash}.contour-v1.bin.gz`;
  const compressed = gzipSync(raw, {level: 9});
  await writeFile(path.join(OUTPUT_DIRECTORY, file), compressed);
  return {
    buffers: packed.layout,
    byteLength: raw.byteLength,
    compressedByteLength: compressed.byteLength,
    file,
    format: 'contour-v1',
  };
}

async function writeArtifact(name, format, width, height, channels, array) {
  const raw = typedArrayBuffer(array);
  const contentHash = hash(raw).slice(0, 16);
  const file = `${name}.${contentHash}.${format}.bin.gz`;
  const compressed = gzipSync(raw, {level: 9});
  await writeFile(path.join(OUTPUT_DIRECTORY, file), compressed);
  return {
    byteLength: raw.byteLength,
    channels,
    compressedByteLength: compressed.byteLength,
    file,
    format,
    height,
    width,
  };
}

async function main() {
  const source = await readFile(SOURCE_PATH);
  const sourceHash = hash(source);
  const configHash = hash(JSON.stringify(stableConfig()));
  const checking = process.argv.includes('--check');
  const current = await checkManifest(sourceHash, configHash);

  if (checking) {
    if (!current) {
      throw new Error('Terrain bake is missing or stale. Run `npm run bake:terrain`.');
    }
    console.log('Terrain bake is current.');
    return;
  }
  if (current && !process.argv.includes('--force')) {
    console.log('Terrain bake is already current.');
    return;
  }

  await mkdir(OUTPUT_DIRECTORY, {recursive: true});
  console.log('Decoding source EXR…');
  const sourceBuffer = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  const parsed = new EXRLoader().parse(sourceBuffer);
  if (!(parsed.data instanceof Uint16Array)) {
    throw new Error('Expected a half-float EXR source.');
  }

  console.log('Baking displacement, shell, and gradient maps…');
  const heights = decodeHeights(parsed.data, parsed.width, parsed.height);
  const gradient = bakeGradientMap(heights, parsed.width, parsed.height);
  const displacement = bakeDisplacement(heights, parsed.width, parsed.height);
  const shellGrid = {
    data: displacement.shell,
    width: displacement.width,
    height: displacement.height,
  };

  console.log('Baking default contour geometry…');
  const contourOptions = contourBuildOptions();
  const contourShell = bakeShellGrid(
    shellGrid,
    contourOptions.smoothIterations,
    contourOptions.smoothFactor,
  );
  const contourBuffers = buildContourTubeBuffers(
    extractIsolines(contourShell, contourOptions),
  );

  console.log('Baking static terrain lighting…');
  const staticLighting = bakeStaticLighting(
    shellGrid,
    gradient,
    parsed.width,
    parsed.height,
  );

  console.log('Compressing terrain artifacts…');
  const artifacts = {
    contours: await writeContourArtifact(contourBuffers),
    displacement: await writeArtifact(
      'displacement',
      'r16f',
      displacement.width,
      displacement.height,
      1,
      displacement.displacement,
    ),
    gradient: await writeArtifact(
      'gradient',
      'rg16f',
      parsed.width,
      parsed.height,
      2,
      gradient,
    ),
    shell: await writeArtifact(
      'shell',
      'f32',
      displacement.width,
      displacement.height,
      1,
      displacement.shell,
    ),
    staticLighting: await writeArtifact(
      'static-lighting',
      'rg16f',
      displacement.width,
      displacement.height,
      2,
      staticLighting,
    ),
  };
  const manifest = {
    artifacts,
    configHash,
    sourceHash,
    version: 2,
  };
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  const compressedTotal = Object.values(artifacts)
    .reduce((total, artifact) => total + artifact.compressedByteLength, 0);
  console.log(`Terrain bake complete (${(compressedTotal / 1024 / 1024).toFixed(2)} MB compressed).`);
}

await main();
