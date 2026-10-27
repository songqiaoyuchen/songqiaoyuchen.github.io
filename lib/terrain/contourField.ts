// The contour field about a place: the drawn contour lines are marched from the shell dilated and smoothed
// (bakeShellGrid) and downsampled, not from the terrain itself, and on a near-level floor the few centimetres
// between the two move an isoline by a metre. Whatever must sit on a drawn contour (the lake's shore) reads
// its heights from this field, built here over a window of the shell only: sampled on the CPU, or handed to a
// shader as a texture on the march's own grid.
import {CONTOUR_CONFIG, TERRAIN_MESH_CONFIG} from '@/config/scene';
import type {HeightGrid} from './bake';
import {normalizeRawHeight} from './height';
import {bakeShellGrid} from './shell';

/** World height from the contour field, or NaN outside the window. */
export type ContourHeightSampler = (x: number, z: number) => number;

export type ContourField = {
  width: number;
  height: number;
  /** World heights on the march's grid, row 0 the window's north edge (v = 0 as a texture, unflipped). */
  heights: Float32Array;
  /** As a texture: the uv of world (x, z) is (x, z) * uvScale + uvOffset, texel centres on the cells' centres. */
  uvScale: readonly [number, number];
  uvOffset: readonly [number, number];
  sample: ContourHeightSampler;
};

/**
 * The contour field within `halfX`/`halfZ` of (x, z), built as the bake builds it: the window dilated and
 * smoothed as the contours' shell is, then averaged down as the contours' march is, with the same padding the
 * smoothing reaches over so the window's edges do not show.
 */
export function contourField(
  shell: HeightGrid,
  x: number,
  z: number,
  halfX: number,
  halfZ: number,
  elevation: number,
  seaLevel: number,
): ContourField {
  const {planeSize} = TERRAIN_MESH_CONFIG;
  const {smoothIterations, smoothFactor, downsample} = CONTOUR_CONFIG;
  const columnsPerUnit = (shell.width - 1) / planeSize;
  const rowsPerUnit = (shell.height - 1) / planeSize;
  const toColumn = (worldX: number) => (worldX / planeSize + 0.5) * (shell.width - 1);
  const toRow = (worldZ: number) => (0.5 - worldZ / planeSize) * (shell.height - 1);
  // The window, with room for the dilation and smoothing to reach over, aligned to the march's cells.
  const pad = (Math.ceil(Math.sqrt(smoothIterations)) + 1 + smoothIterations) * 2 + downsample * 2;
  const align = (value: number) => Math.floor(value / downsample) * downsample;
  const c0 = Math.max(0, align(Math.floor(toColumn(x - halfX)) - pad));
  const r0 = Math.max(0, align(Math.floor(toRow(z + halfZ)) - pad));
  const c1 = Math.min(shell.width, align(Math.ceil(toColumn(x + halfX)) + pad) + downsample);
  const r1 = Math.min(shell.height, align(Math.ceil(toRow(z - halfZ)) + pad) + downsample);
  const width = c1 - c0;
  const height = r1 - r0;
  const data = new Float32Array(width * height);
  for (let r = 0; r < height; r++) {
    const row = (r0 + r) * shell.width;
    data.set(shell.data.subarray(row + c0, row + c1), r * width);
  }
  const smoothed = bakeShellGrid({data, width, height}, smoothIterations, smoothFactor);
  // Averaged down as the march's field is (downsampleGrid in lib/terrain/isolines.ts), in world height.
  const fieldWidth = Math.floor(width / downsample);
  const fieldHeight = Math.floor(height / downsample);
  const base = TERRAIN_MESH_CONFIG.position[1];
  const heights = new Float32Array(fieldWidth * fieldHeight);
  for (let fy = 0; fy < fieldHeight; fy++) {
    for (let fx = 0; fx < fieldWidth; fx++) {
      let sum = 0;
      for (let by = 0; by < downsample; by++) {
        const row = (fy * downsample + by) * width + fx * downsample;
        for (let bx = 0; bx < downsample; bx++) sum += smoothed.data[row + bx];
      }
      heights[fy * fieldWidth + fx] = base + normalizeRawHeight(sum / (downsample * downsample), seaLevel) * elevation;
    }
  }
  // The march places a cell's value at its centre; the texture's texel centres and the sampler below agree.
  const cellsX = downsample * fieldWidth;
  const cellsY = downsample * fieldHeight;
  const uvScale = [columnsPerUnit / cellsX, -rowsPerUnit / cellsY] as const;
  const uvOffset = [
    ((shell.width - 1) * 0.5 - c0 + 0.5) / cellsX,
    ((shell.height - 1) * 0.5 - r0 + 0.5) / cellsY,
  ] as const;
  const sample: ContourHeightSampler = (worldX, worldZ) => {
    const gx = (toColumn(worldX) - c0 + 0.5) / downsample - 0.5;
    const gy = (toRow(worldZ) - r0 + 0.5) / downsample - 0.5;
    if (gx < 0 || gy < 0 || gx > fieldWidth - 1 || gy > fieldHeight - 1) return Number.NaN;
    const x0 = Math.min(Math.floor(gx), fieldWidth - 2);
    const y0 = Math.min(Math.floor(gy), fieldHeight - 2);
    const tx = gx - x0;
    const ty = gy - y0;
    const top = heights[y0 * fieldWidth + x0] * (1 - tx) + heights[y0 * fieldWidth + x0 + 1] * tx;
    const bottom = heights[(y0 + 1) * fieldWidth + x0] * (1 - tx) + heights[(y0 + 1) * fieldWidth + x0 + 1] * tx;
    return top * (1 - ty) + bottom * ty;
  };
  return {width: fieldWidth, height: fieldHeight, heights, uvScale, uvOffset, sample};
}
