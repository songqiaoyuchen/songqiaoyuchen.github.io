// Travel globe maps and lights, off the main thread: the elevation map's summary (the map blurred to its broad
// forms), the bilinear sampler that reads either map as the shaders' linear filter does, and the land's light points
// sampled over the sphere from them. Framework-free, so travel.worker.ts runs it, the main thread can run it where a
// worker cannot decode images (useElevation.ts), and scripts/test can check it.

/** Even samples over the sphere before the land and density tests. */
export const LIGHT_SAMPLES = 140000;
// Each sample nudged off the lattice by up to this share of the sample spacing, so no rows show at the planet's scale.
const JITTER = 0.9;
const SEA = 0.004;

/** The elevation map decoded: its heights 0 to 255, rows top-down as in the image. */
export type ElevationMapData = {
  width: number;
  height: number;
  heights: Uint8Array;
};

/** One attribute per light point: unit positions (three per point), the map's heights there, the summary's, each
 * point's brightness and its twinkle seed. */
export type LightBuffers = {
  positions: Float32Array;
  heights: Float32Array;
  summaries: Float32Array;
  intensities: Float32Array;
  seeds: Float32Array;
};

export function hash(x: number, y: number) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

// Three box passes (about a Gaussian) of radius texels, wrapping east-west and clamped at the poles, in place.
export function blurMap(values: Float32Array, width: number, height: number, radius: number) {
  const scratch = new Float32Array(values.length);
  const span = 2 * radius + 1;
  const wrap = (column: number) => ((column % width) + width) % width;
  const clamp = (row: number) => Math.min(height - 1, Math.max(0, row));
  for (let pass = 0; pass < 3; pass++) {
    for (let row = 0; row < height; row++) {
      const base = row * width;
      let sum = 0;
      for (let k = -radius; k <= radius; k++) sum += values[base + wrap(k)];
      for (let column = 0; column < width; column++) {
        scratch[base + column] = sum / span;
        sum += values[base + wrap(column + radius + 1)] - values[base + wrap(column - radius)];
      }
    }
    for (let column = 0; column < width; column++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) sum += scratch[clamp(k) * width + column];
      for (let row = 0; row < height; row++) {
        values[row * width + column] = sum / span;
        sum += scratch[clamp(row + radius + 1) * width + column] - scratch[clamp(row - radius) * width + column];
      }
    }
  }
}

/** The map's summary: blurred over `summaryBlur` texels and rounded back to bytes, rows top-down like the map. */
export function summarizeMap({width, height, heights}: ElevationMapData, summaryBlur: number) {
  const values = Float32Array.from(heights);
  if (summaryBlur > 0) blurMap(values, width, height, Math.round(summaryBlur));
  const summary = new Uint8Array(values.length);
  for (let index = 0; index < values.length; index++) summary[index] = Math.round(values[index]);
  return summary;
}

/** The rows reversed: a DataTexture (flipY off) wants the bottom row first for the shaders to read the map as the
 * image texture was uploaded, flipped. */
export function flipRows(values: Uint8Array, width: number, height: number) {
  const flipped = new Uint8Array(values.length);
  for (let row = 0; row < height; row++) {
    flipped.set(values.subarray(row * width, (row + 1) * width), (height - 1 - row) * width);
  }
  return flipped;
}

/**
 * Normalized height (0 sea, 1 the highest ground) at a place: bilinear between texel centres, wrapping east-west
 * and clamped at the poles, as the shaders' linear filter reads the map (u = 0.5 + lon / 360, v = 0.5 + lat / 180),
 * so markers stand exactly on the trails.
 */
export function sampleMap(map: ArrayLike<number>, width: number, height: number, lon: number, lat: number) {
  const x = (lon + 180) / 360 * width - 0.5;
  const y = Math.min(height - 1, Math.max(0, (90 - lat) / 180 * height - 0.5));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const c0 = ((x0 % width) + width) % width;
  const c1 = (c0 + 1) % width;
  const r0 = y0 * width;
  const r1 = Math.min(height - 1, y0 + 1) * width;
  const top = map[r0 + c0] * (1 - fx) + map[r0 + c1] * fx;
  const bottom = map[r1 + c0] * (1 - fx) + map[r1 + c1] * fx;
  return (top * (1 - fy) + bottom * fy) / 255;
}

export type LightSample = {x: number; y: number; z: number};

/** The `index`-th of `samples` points on the unit sphere: a golden spiral, each point nudged along its local east
 * and north and put back on the sphere. */
export function lightSample(index: number, samples: number, out: LightSample) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const spacing = Math.sqrt(4 * Math.PI / samples);
  const y0 = 1 - (index / (samples - 1)) * 2;
  const ring = Math.sqrt(1 - y0 * y0);
  const theta = golden * index;
  const east = (hash(index, 0.37) - 0.5) * 2 * JITTER * spacing;
  const north = (hash(index, 0.91) - 0.5) * 2 * JITTER * spacing;
  const x = Math.cos(theta) * ring - Math.sin(theta) * east - y0 * Math.cos(theta) * north;
  const z = Math.sin(theta) * ring + Math.cos(theta) * east - y0 * Math.sin(theta) * north;
  const y = y0 + ring * north;
  const length = Math.hypot(x, y, z);
  out.x = x / length;
  out.y = y / length;
  out.z = z / length;
  return out;
}

/**
 * The land's light points: the spiral's samples on land (above SEA, north of the Antarctic), kept by `density`
 * (the share of candidates), more where the land is low; denser and brighter in lowlands and in loose clusters,
 * like a night-side satellite view. Deterministic in the map, the density and the sample count.
 */
export function sampleLights(map: ElevationMapData, summary: Uint8Array, density: number, samples = LIGHT_SAMPLES) {
  const {width, height, heights} = map;
  const positions = new Float32Array(samples * 3);
  const pointHeights = new Float32Array(samples);
  const summaries = new Float32Array(samples);
  const intensities = new Float32Array(samples);
  const seeds = new Float32Array(samples);
  const sample: LightSample = {x: 0, y: 0, z: 0};
  let count = 0;
  for (let index = 0; index < samples; index++) {
    const {x, y, z} = lightSample(index, samples, sample);
    // Kept as written when the points were first sampled: another order of the same products would round
    // differently and, through the hash, keep a different point here and there.
    const lat = Math.asin(y) * 180 / Math.PI;
    const lon = Math.atan2(x, z) * 180 / Math.PI;
    if (lat < -60) continue;
    const landHeight = sampleMap(heights, width, height, lon, lat);
    if (landHeight < SEA) continue;
    // Lowland is where people live; loose clusters stand in for cities until real data arrives.
    const lowland = Math.pow(1 - Math.min(landHeight * 2.2, 1), 1.5);
    const cluster = 0.5 + 0.5 * Math.sin(lon * 0.21 + 1.3) * Math.sin(lat * 0.37 + 0.4)
      + 0.4 * Math.sin(lon * 0.9) * Math.cos(lat * 0.7);
    if (hash(lon * 3.1, lat * 2.7) > density * (0.65 + 1.3 * lowland * Math.max(cluster, 0.2))) continue;
    positions[count * 3] = x;
    positions[count * 3 + 1] = y;
    positions[count * 3 + 2] = z;
    pointHeights[count] = landHeight;
    summaries[count] = sampleMap(summary, width, height, lon, lat);
    intensities[count] = 0.35 + 0.65 * Math.pow(hash(lat * 5.3, lon * 7.1), 1.8) * (0.4 + 0.6 * lowland);
    seeds[count] = hash(lon * 1.7, lat * 9.3);
    count++;
  }
  const lights: LightBuffers = {
    positions: positions.slice(0, count * 3),
    heights: pointHeights.slice(0, count),
    summaries: summaries.slice(0, count),
    intensities: intensities.slice(0, count),
    seeds: seeds.slice(0, count),
  };
  return lights;
}

/** The light buffers' memory, for a zero-copy postMessage. */
export function lightTransferables(lights: LightBuffers) {
  return [
    lights.positions.buffer, lights.heights.buffer, lights.summaries.buffer, lights.intensities.buffer,
    lights.seeds.buffer,
  ];
}
