// Surface distance ("reach") from a summit over the terrain: how far a wave spreading across the ground has to
// travel to get to each point, over hills rather than through them. Dijkstra on a coarsened height grid with
// sixteen neighbours (the knight's moves keep the front round on the plain), edge lengths measured in 3D.
// The homepage intro reveal draws the contour lines in by this distance (contours.vert/.frag).
// Worker- and node-safe: no three.js, no config imports.
import type {HeightGrid} from './bake';

export type ReachOptions = {
  /** World size of the (square) plane the grid spans. */
  planeSize: number;
  /** Normalized height to world height. */
  elevation: number;
  /** The terrain's contrast curve and sea level (terrain.vert's processH). */
  contrast: number;
  seaLevel: number;
  /** Grid cells per field cell; the field is this many times coarser than the grid. */
  downsample: number;
  /** Where the wave starts: the highest cell within `originRadius` (world units) of this plan point (x, z); a
   *  radius of 0 takes the nearest cell. Left out, the grid's highest cell. */
  origin?: [number, number];
  originRadius?: number;
};

export type ReachField = {
  /** Row-major, `data[row * width + column]`, the same orientation as the height grid; world units. */
  data: Float32Array;
  width: number;
  height: number;
  /** The field's largest value. */
  max: number;
  /** The summit the distances start from, world x and z. */
  origin: [number, number];
};

// Column and row steps to the sixteen neighbours, with their plan lengths in cells.
const STEPS: Array<[number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
  [1, 2], [1, -2], [-1, 2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1],
];

/** A binary min-heap of cell indices keyed by their tentative distance. */
class CellHeap {
  private readonly items: number[] = [];
  private readonly keys: Float32Array;

  constructor(keys: Float32Array) {
    this.keys = keys;
  }

  get size() {
    return this.items.length;
  }

  push(cell: number) {
    const {items, keys} = this;
    items.push(cell);
    let index = items.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (keys[items[parent]] <= keys[cell]) break;
      items[index] = items[parent];
      index = parent;
    }
    items[index] = cell;
  }

  pop() {
    const {items, keys} = this;
    const top = items[0];
    const last = items.pop() as number;
    if (items.length === 0) return top;
    let index = 0;
    const count = items.length;
    for (;;) {
      const left = index * 2 + 1;
      if (left >= count) break;
      const right = left + 1;
      const child = right < count && keys[items[right]] < keys[items[left]] ? right : left;
      if (keys[items[child]] >= keys[last]) break;
      items[index] = items[child];
      index = child;
    }
    items[index] = last;
    return top;
  }
}

/** Builds the reach field from the summit (the highest cell, near the asked-for origin if one is given). */
export function buildReachField(grid: HeightGrid, options: ReachOptions): ReachField {
  const {planeSize, elevation, contrast, seaLevel, downsample, origin: wanted, originRadius = 0} = options;
  const step = Math.max(1, Math.floor(downsample));
  const width = Math.max(2, Math.floor((grid.width - 1) / step) + 1);
  const height = Math.max(2, Math.floor((grid.height - 1) / step) + 1);
  const cellX = planeSize / (width - 1);
  const cellZ = planeSize / (height - 1);
  const seaSpan = Math.max(1 - seaLevel, 0.0001);

  // World heights of the coarse cells, and the summit: the highest cell, or the highest near the wanted origin
  // (the nearest cell when nothing else is within the radius). Column 0 is the plane's -x edge; row 0 its +z
  // edge (the grid's v runs opposite to z).
  const heights = new Float32Array(width * height);
  const wantedColumn = wanted ? (wanted[0] + planeSize / 2) / cellX : 0;
  const wantedRow = wanted ? (planeSize / 2 - wanted[1]) / cellZ : 0;
  let summit = wanted
    ? Math.min(height - 1, Math.max(0, Math.round(wantedRow))) * width
      + Math.min(width - 1, Math.max(0, Math.round(wantedColumn)))
    : 0;
  for (let row = 0; row < height; row++) {
    const gridRow = Math.min(grid.height - 1, row * step);
    for (let column = 0; column < width; column++) {
      const gridColumn = Math.min(grid.width - 1, column * step);
      const raw = grid.data[gridRow * grid.width + gridColumn];
      const curved = Math.pow(Math.max(raw, 0), contrast);
      const normalized = Math.min(1, Math.max(0, (curved - seaLevel) / seaSpan));
      const cell = row * width + column;
      heights[cell] = normalized * elevation;
      if (heights[cell] <= heights[summit]) continue;
      if (wanted && Math.hypot((column - wantedColumn) * cellX, (row - wantedRow) * cellZ) > originRadius) continue;
      summit = cell;
    }
  }

  const data = new Float32Array(width * height).fill(Number.POSITIVE_INFINITY);
  const settled = new Uint8Array(width * height);
  const heap = new CellHeap(data);
  data[summit] = 0;
  heap.push(summit);
  let max = 0;
  while (heap.size > 0) {
    const cell = heap.pop();
    if (settled[cell]) continue;
    settled[cell] = 1;
    const distance = data[cell];
    if (distance > max) max = distance;
    const row = Math.floor(cell / width);
    const column = cell - row * width;
    for (const [dColumn, dRow] of STEPS) {
      const nextColumn = column + dColumn;
      const nextRow = row + dRow;
      if (nextColumn < 0 || nextColumn >= width || nextRow < 0 || nextRow >= height) continue;
      const next = nextRow * width + nextColumn;
      if (settled[next]) continue;
      const rise = heights[next] - heights[cell];
      const length = Math.sqrt((dColumn * cellX) ** 2 + (dRow * cellZ) ** 2 + rise * rise);
      const candidate = distance + length;
      if (candidate < data[next]) {
        data[next] = candidate;
        heap.push(next);
      }
    }
  }

  const summitRow = Math.floor(summit / width);
  const summitColumn = summit - summitRow * width;
  const origin: [number, number] = [
    summitColumn * cellX - planeSize / 2,
    planeSize / 2 - summitRow * cellZ,
  ];
  return {data, width, height, max, origin};
}
