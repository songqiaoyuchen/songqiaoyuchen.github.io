// The intro's contour map: a height field over the screen seeded by the mark's outline, so its isolines are the
// mark's own shape just outside it and wander into other hills further out, and the marching-squares isolines the
// ink draws level by level (components/home/preloader/IntroInk.tsx). Lengths are given in CSS pixels and scaled to
// the field's cells, so the map keeps its character at any resolution. No DOM or three.js, so the node test can
// load it (scripts/test/test-map-field.mjs).

export type Point = readonly [number, number];

export type MapField = {
  width: number;
  height: number;
  /** Cell values: the perturbed distance from the mark's outline, in cells; negative inside the mark. */
  data: Float32Array;
  /** The largest value: isolines exist up to it. */
  max: number;
};

export type MapFieldOptions = {
  /** Cells per CSS pixel. */
  scale: number;
  /** How much the map's own landforms bend and break the mark's shape (0: concentric offsets, 1: the map). */
  wobble: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

/** A deterministic hash of an integer lattice point to [0, 1). */
export function hash2(ix: number, iy: number) {
  let h = (ix * 374761393 + iy * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smoothly interpolated value noise, [0, 1). */
export function valueNoise(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/** Fractal value noise, [0, 1), each octave offset so they do not line up. */
export function fbm(x: number, y: number, octaves: number) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;
  for (let octave = 0; octave < octaves; octave++) {
    value += amplitude * valueNoise(x * frequency + octave * 7.1, y * frequency - octave * 3.3);
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / total;
}

/** The distance from (x, y) to the nearest point of a polyline. */
export function distanceToPolyline(x: number, y: number, points: readonly Point[]) {
  let best = Infinity;
  for (let index = 1; index < points.length; index++) {
    const [ax, ay] = points[index - 1];
    const [bx, by] = points[index];
    const dx = bx - ax;
    const dy = by - ay;
    const length = dx * dx + dy * dy || 1;
    const t = clamp01(((x - ax) * dx + (y - ay) * dy) / length);
    const px = ax + dx * t - x;
    const py = ay + dy * t - y;
    best = Math.min(best, px * px + py * py);
  }
  return Math.sqrt(best);
}

/** Whether (x, y) lies inside a closed polyline (even-odd). */
export function insidePolygon(x: number, y: number, points: readonly Point[]) {
  let inside = false;
  for (let index = 1; index < points.length; index++) {
    const [ax, ay] = points[index - 1];
    const [bx, by] = points[index];
    if ((ay > y) !== (by > y) && x < ax + (bx - ax) * (y - ay) / (by - ay)) inside = !inside;
  }
  return inside;
}

// The map's character, in CSS pixels: how far out the lines are still the mark's shape (the ramp to the map's own
// landforms), the gentle wander close in, and the landforms far out: broad hills and basins, a finer ridge and
// valley texture, and how much the mark's own slope flattens out there so they can close into peaks of their own.
const SHAPE_REACH_PX = 260;
const WANDER_WAVELENGTH_PX = 210;
const WANDER_NEAR_PX = 12;
const HILL_WAVELENGTH_PX = 420;
const HILL_HEIGHT_PX = 120;
const RIDGE_WAVELENGTH_PX = 170;
const RIDGE_HEIGHT_PX = 45;
// Kept under the landforms' slope, so values still climb outward and the map accretes from the mark.
const FLATTEN = 0.35;
// Steepness varies slowly across the page: lines pack where the ground is steep and spread on the plateaus. The
// factor runs from exp(-range) to exp(range) of the base slope.
const STEEP_WAVELENGTH_PX = 520;
const STEEP_RANGE = 1.1;

/**
 * The field over a width-by-height grid of cells: the distance from the outline (cells, negative inside), the
 * mark's own offsets close in, giving way further out to landforms of their own (the mark's slope flattening as
 * hills and basins take over, the slope steep in some regions and gentle in others), so the lines leave the mark as
 * its own shape and become a varied map. `outline` is in cells; `relief` scales the landforms (0 keeps concentric
 * offsets).
 */
export function buildMapField(
  width: number, height: number, outline: readonly Point[], {scale, wobble: relief}: MapFieldOptions,
): MapField {
  const data = new Float32Array(width * height);
  const reach = SHAPE_REACH_PX * scale;
  const wanderNear = WANDER_NEAR_PX * scale * relief;
  const hillHeight = HILL_HEIGHT_PX * scale * relief;
  const ridgeHeight = RIDGE_HEIGHT_PX * scale * relief;
  const wanderFrequency = 1 / (WANDER_WAVELENGTH_PX * scale);
  const hillFrequency = 1 / (HILL_WAVELENGTH_PX * scale);
  const ridgeFrequency = 1 / (RIDGE_WAVELENGTH_PX * scale);
  const steepFrequency = 1 / (STEEP_WAVELENGTH_PX * scale);
  let max = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const distance = distanceToPolyline(x, y, outline) * (insidePolygon(x, y, outline) ? -1 : 1);
      const far = smoothstep(0, reach, distance);
      const wander = (fbm(x * wanderFrequency, y * wanderFrequency, 3) - 0.5) * 2 * wanderNear;
      const hills = (fbm(x * hillFrequency + 9, y * hillFrequency + 4, 3) - 0.5) * 2 * hillHeight;
      const ridges = (fbm(x * ridgeFrequency + 31, y * ridgeFrequency + 17, 2) - 0.5) * 2 * ridgeHeight;
      const steepNoise = fbm(x * steepFrequency + 53, y * steepFrequency + 71, 2) - 0.5;
      const steep = Math.exp(STEEP_RANGE * relief * steepNoise * 2);
      const base = distance * (1 - FLATTEN * relief * far) + wander + (hills + ridges) * far;
      const value = base * (1 + (steep - 1) * far);
      data[y * width + x] = value;
      if (value > max) max = value;
    }
  }
  return {width, height, data, max};
}

/** How many isolines a spacing (in cells) gives the field: level k (1-based) is the isoline at k · spacing. */
export function levelCount(field: MapField, spacing: number) {
  return Math.max(0, Math.ceil(field.max / spacing) - 1);
}

/**
 * The isoline at `iso` by marching squares: line segments as [x0, y0, x1, y1, ...] in cells, each crossing found
 * by linear interpolation along the cell's edges.
 */
export function traceIsoline(field: MapField, iso: number): Float32Array {
  const {width, height, data} = field;
  const segments: number[] = [];
  const push = (ax: number, ay: number, bx: number, by: number) => { segments.push(ax, ay, bx, by); };
  for (let y = 0; y < height - 1; y++) {
    const row = y * width;
    for (let x = 0; x < width - 1; x++) {
      const a = data[row + x];
      const b = data[row + x + 1];
      const c = data[row + width + x + 1];
      const d = data[row + width + x];
      const code = (a > iso ? 8 : 0) | (b > iso ? 4 : 0) | (c > iso ? 2 : 0) | (d > iso ? 1 : 0);
      if (code === 0 || code === 15) continue;
      // The crossings on the top, right, bottom and left edges (only those the case needs are finite).
      const tx = x + (iso - a) / (b - a);
      const ry = y + (iso - b) / (c - b);
      const bx = x + (iso - d) / (c - d);
      const ly = y + (iso - a) / (d - a);
      switch (code) {
        case 1: case 14: push(x, ly, bx, y + 1); break;
        case 2: case 13: push(bx, y + 1, x + 1, ry); break;
        case 3: case 12: push(x, ly, x + 1, ry); break;
        case 4: case 11: push(tx, y, x + 1, ry); break;
        case 5: push(tx, y, x, ly); push(bx, y + 1, x + 1, ry); break;
        case 6: case 9: push(tx, y, bx, y + 1); break;
        case 7: case 8: push(tx, y, x, ly); break;
        case 10: push(tx, y, x + 1, ry); push(x, ly, bx, y + 1); break;
        default: break;
      }
    }
  }
  return Float32Array.from(segments);
}
