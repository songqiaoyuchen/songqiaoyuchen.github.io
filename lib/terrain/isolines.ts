import type { HeightGrid } from './bake';

/**
 * One extracted contour line, ready for tube expansion.
 * Points are world-space XZ (plane orientation already applied); Y is the
 * line's normalized height (0..1) — constant per line by definition of an
 * isoline — so elevation/lift scaling can stay live in the vertex shader.
 */
export interface Isoline {
  /** Flat [x, z, x, z, ...] world-space coordinates, in path order. */
  points: Float32Array;
  /** 0-based contour level index (drives major/minor interleave). */
  level: number;
  /** Normalized height of this contour in visual (post-contrast) space. */
  levelValue: number;
  closed: boolean;
  /** World-space arc length of the whole line. */
  totalLength: number;
}

export interface IsolineOptions {
  /** Number of evenly spaced contour levels across normalized height. */
  levels: number;
  /** Height curve exponent — must match the terrain shaders' normalizedHeight. */
  contrast: number;
  /** Lower cut of the normalized height range — must match the shaders. */
  seaLevel: number;
  /** World size of the terrain plane (TERRAIN_CONFIG.mesh.planeSize). */
  planeSize: number;
  /** Extraction grid downsample factor; the shell field is smooth, so 2 loses nothing. */
  downsample?: number;
  /** Ramer-Douglas-Peucker tolerance in world units. */
  rdpEpsilon?: number;
  /** Chaikin corner-cutting passes — the cartographic-smoothness knob. */
  chaikinIterations?: number;
  /** Final uniform point spacing in world units (keeps pulse speed constant). */
  resampleSpacing?: number;
  /** Drop lines shorter than this after smoothing (world units). */
  minLength?: number;
}

/**
 * Extract contour polylines from a height grid via marching squares.
 *
 * The grid holds raw (pre-contrast) heights; rather than transforming the
 * whole field, each level's threshold is inverse-transformed once:
 * visual level v lies at raw height (seaLevel + v*(1-seaLevel))^(1/contrast).
 */
export function extractIsolines(grid: HeightGrid, options: IsolineOptions): Isoline[] {
  const {
    levels,
    contrast,
    seaLevel,
    planeSize,
    downsample = 2,
    rdpEpsilon = 0.012,
    chaikinIterations = 3,
    resampleSpacing = 0.06,
    minLength = 0.5,
  } = options;

  const field = downsampleGrid(grid, downsample);
  const { width: gw, height: gh } = field;
  // One grid step in world units; grid samples sit at texel centers.
  const worldPerGrid = planeSize / gw;

  // The terrain only occupies part of the normalized height range; spread
  // the requested level count across the field's actual span so every level
  // yields lines (evenly spaced in visual height, like the old band shader).
  let rawMin = Infinity;
  let rawMax = -Infinity;
  for (let i = 0; i < field.data.length; i++) {
    const v = field.data[i];
    if (v < rawMin) rawMin = v;
    if (v > rawMax) rawMax = v;
  }
  const toVisual = (raw: number) =>
    Math.min(Math.max(
      (Math.pow(Math.max(raw, 0), contrast) - seaLevel) / Math.max(1 - seaLevel, 0.0001),
    0), 1);
  const visMin = toVisual(rawMin);
  const visMax = toVisual(rawMax);

  const result: Isoline[] = [];
  for (let level = 0; level < levels; level++) {
    const levelValue = visMin + (visMax - visMin) * ((level + 0.5) / levels);
    const rawThreshold = Math.pow(
      seaLevel + levelValue * Math.max(1 - seaLevel, 0.0001),
      1 / contrast,
    );
    if (rawThreshold >= 1) continue;

    for (const line of marchLevel(field, rawThreshold)) {
      let pts = rdpSimplify(line.points, rdpEpsilon / worldPerGrid, line.closed);
      pts = chaikinSmooth(pts, chaikinIterations, line.closed);
      pts = resampleUniform(pts, resampleSpacing / worldPerGrid, line.closed);
      if (pts.length < 3 * 2) continue;

      // Grid → world: gx maps to uv.x = (gx+0.5)/gw, plane local x = (uv.x-0.5)*size,
      // and the plane's -PI/2 X-rotation sends local y to world -z.
      const points = new Float32Array(pts.length);
      for (let i = 0; i < pts.length; i += 2) {
        points[i] = ((pts[i] + 0.5) / gw - 0.5) * planeSize;
        points[i + 1] = -(((pts[i + 1] + 0.5) / gh - 0.5) * planeSize);
      }

      let totalLength = 0;
      for (let i = 2; i < points.length; i += 2) {
        totalLength += Math.hypot(points[i] - points[i - 2], points[i + 1] - points[i - 1]);
      }
      if (totalLength < minLength) continue;

      result.push({ points, level, levelValue, closed: line.closed, totalLength });
    }
  }
  return result;
}

/** World-space XZ of the grid's highest sample — the intro reveal origin. */
export function findPeakOrigin(grid: HeightGrid, planeSize: number): [number, number] {
  const { data, width, height } = grid;
  let best = 0;
  for (let i = 1; i < data.length; i++) if (data[i] > data[best]) best = i;
  const gx = best % width;
  const gy = (best - gx) / width;
  return [
    ((gx + 0.5) / width - 0.5) * planeSize,
    -(((gy + 0.5) / height - 0.5) * planeSize),
  ];
}

function downsampleGrid(grid: HeightGrid, factor: number): HeightGrid {
  if (factor <= 1) return grid;
  const w = Math.floor(grid.width / factor);
  const h = Math.floor(grid.height / factor);
  const data = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let by = 0; by < factor; by++) {
        const row = (y * factor + by) * grid.width + x * factor;
        for (let bx = 0; bx < factor; bx++) sum += grid.data[row + bx];
      }
      data[y * w + x] = sum / (factor * factor);
    }
  }
  return { data, width: w, height: h };
}

interface GridPolyline {
  /** Flat [gx, gy, ...] grid-space coordinates. */
  points: number[];
  closed: boolean;
}

/**
 * Marching squares at one threshold. Crossing points are keyed by the grid
 * edge they sit on, so segments from neighboring cells share endpoints
 * exactly and chain into polylines without any tolerance matching.
 */
function marchLevel(field: HeightGrid, threshold: number): GridPolyline[] {
  const { data, width: w, height: h } = field;

  const pointX: number[] = [];
  const pointY: number[] = [];
  const edgeToPoint = new Map<number, number>();
  // adjacency: up to 2 neighbors per crossing point (saddles resolved per-cell)
  const adjA: number[] = [];
  const adjB: number[] = [];

  // Edge keys: horizontal edge right of node (x,y) → 2*(y*w+x); vertical edge above → +1.
  const pointOnEdge = (x0: number, y0: number, x1: number, y1: number, key: number): number => {
    let idx = edgeToPoint.get(key);
    if (idx !== undefined) return idx;
    const f0 = data[y0 * w + x0];
    const f1 = data[y1 * w + x1];
    const t = f1 === f0 ? 0.5 : (threshold - f0) / (f1 - f0);
    idx = pointX.length;
    pointX.push(x0 + (x1 - x0) * t);
    pointY.push(y0 + (y1 - y0) * t);
    adjA.push(-1);
    adjB.push(-1);
    edgeToPoint.set(key, idx);
    return idx;
  };

  const link = (a: number, b: number) => {
    if (adjA[a] === -1) adjA[a] = b;
    else if (adjB[a] === -1) adjB[a] = b;
    if (adjA[b] === -1) adjA[b] = a;
    else if (adjB[b] === -1) adjB[b] = a;
  };

  for (let y = 0; y < h - 1; y++) {
    const row = y * w;
    for (let x = 0; x < w - 1; x++) {
      const f00 = data[row + x];
      const f10 = data[row + x + 1];
      const f01 = data[row + w + x];
      const f11 = data[row + w + x + 1];
      let caseIdx = 0;
      if (f00 >= threshold) caseIdx |= 1;
      if (f10 >= threshold) caseIdx |= 2;
      if (f11 >= threshold) caseIdx |= 4;
      if (f01 >= threshold) caseIdx |= 8;
      if (caseIdx === 0 || caseIdx === 15) continue;

      // Crossing points on the cell's four edges (created lazily).
      const B = () => pointOnEdge(x, y, x + 1, y, 2 * (row + x));
      const T = () => pointOnEdge(x, y + 1, x + 1, y + 1, 2 * (row + w + x));
      const L = () => pointOnEdge(x, y, x, y + 1, 2 * (row + x) + 1);
      const R = () => pointOnEdge(x + 1, y, x + 1, y + 1, 2 * (row + x + 1) + 1);

      switch (caseIdx) {
        case 1: case 14: link(L(), B()); break;
        case 2: case 13: link(B(), R()); break;
        case 3: case 12: link(L(), R()); break;
        case 4: case 11: link(R(), T()); break;
        case 6: case 9:  link(B(), T()); break;
        case 7: case 8:  link(L(), T()); break;
        case 5:
          if ((f00 + f10 + f01 + f11) * 0.25 >= threshold) { link(L(), T()); link(B(), R()); }
          else { link(L(), B()); link(R(), T()); }
          break;
        case 10:
          if ((f00 + f10 + f01 + f11) * 0.25 >= threshold) { link(L(), B()); link(R(), T()); }
          else { link(L(), T()); link(B(), R()); }
          break;
      }
    }
  }

  // Chain crossings into polylines: open lines start at degree-1 points,
  // whatever remains is closed loops.
  const lines: GridPolyline[] = [];
  const visited = new Uint8Array(pointX.length);

  const walk = (start: number) => {
    const pts: number[] = [pointX[start], pointY[start]];
    visited[start] = 1;
    let prev = -1;
    let cur = start;
    for (;;) {
      const next = adjA[cur] !== prev ? adjA[cur] : adjB[cur];
      if (next === -1) break;
      if (next === start) {
        // loop closed — repeat the first point so downstream code treats it as a ring seam
        pts.push(pointX[start], pointY[start]);
        return { points: pts, closed: true };
      }
      if (visited[next]) break;
      visited[next] = 1;
      pts.push(pointX[next], pointY[next]);
      prev = cur;
      cur = next;
    }
    return { points: pts, closed: false };
  };

  // open lines first (degree-1 starts), then whatever remains must be loops
  for (let i = 0; i < pointX.length; i++) {
    if (visited[i] || adjB[i] !== -1) continue;
    if (adjA[i] === -1) { visited[i] = 1; continue; } // isolated point
    lines.push(walk(i));
  }
  for (let i = 0; i < pointX.length; i++) {
    if (visited[i]) continue;
    lines.push(walk(i));
  }
  return lines;
}

/** Ramer-Douglas-Peucker on a flat [x,y,...] polyline (epsilon in the same units). */
function rdpSimplify(points: number[] | Float32Array, epsilon: number, closed: boolean): number[] {
  const n = points.length / 2;
  if (n <= 2) return Array.from(points);
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;

  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const ax = points[a * 2], ay = points[a * 2 + 1];
    const bx = points[b * 2], by = points[b * 2 + 1];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let worst = -1;
    let worstDist = epsilon * epsilon;
    for (let i = a + 1; i < b; i++) {
      const px = points[i * 2] - ax, py = points[i * 2 + 1] - ay;
      let d2: number;
      if (len2 === 0) d2 = px * px + py * py;
      else {
        const t = Math.max(0, Math.min(1, (px * dx + py * dy) / len2));
        const ex = px - t * dx, ey = py - t * dy;
        d2 = ex * ex + ey * ey;
      }
      if (d2 > worstDist) { worstDist = d2; worst = i; }
    }
    if (worst >= 0) {
      keep[worst] = 1;
      stack.push([a, worst], [worst, b]);
    }
  }

  const out: number[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(points[i * 2], points[i * 2 + 1]);
  // closed rings carry a duplicated seam point; RDP keeps both ends, so the ring survives
  void closed;
  return out;
}

/**
 * Chaikin corner cutting: each pass replaces every point pair with points at
 * 1/4 and 3/4 along the segment, converging on a smooth quadratic B-spline.
 * Open lines keep their endpoints pinned; rings cut across the seam too.
 */
function chaikinSmooth(points: number[], iterations: number, closed: boolean): number[] {
  let pts = points;
  for (let it = 0; it < iterations; it++) {
    const n = pts.length / 2;
    if (n < 3) return pts;
    const out: number[] = [];
    if (closed) {
      // ignore the duplicated seam point while cutting, re-add it after
      const m = n - 1;
      for (let i = 0; i < m; i++) {
        const j = (i + 1) % m;
        const x0 = pts[i * 2], y0 = pts[i * 2 + 1];
        const x1 = pts[j * 2], y1 = pts[j * 2 + 1];
        out.push(x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25);
        out.push(x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75);
      }
      out.push(out[0], out[1]);
    } else {
      out.push(pts[0], pts[1]);
      for (let i = 0; i < n - 1; i++) {
        const x0 = pts[i * 2], y0 = pts[i * 2 + 1];
        const x1 = pts[i * 2 + 2], y1 = pts[i * 2 + 3];
        out.push(x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25);
        out.push(x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75);
      }
      out.push(pts[(n - 1) * 2], pts[(n - 1) * 2 + 1]);
    }
    pts = out;
  }
  return pts;
}

/** Resample to uniform spacing so arc-length t advances evenly per vertex. */
function resampleUniform(points: number[], spacing: number, closed: boolean): number[] {
  const n = points.length / 2;
  if (n < 2) return points;

  let total = 0;
  for (let i = 1; i < n; i++) {
    total += Math.hypot(points[i * 2] - points[i * 2 - 2], points[i * 2 + 1] - points[i * 2 - 1]);
  }
  const count = Math.max(closed ? 4 : 2, Math.round(total / spacing));
  const step = total / count;

  const out: number[] = [points[0], points[1]];
  let target = step;
  let acc = 0;
  for (let i = 1; i < n; i++) {
    const x0 = points[i * 2 - 2], y0 = points[i * 2 - 1];
    const x1 = points[i * 2], y1 = points[i * 2 + 1];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    while (acc + seg >= target && out.length / 2 < count) {
      const t = (target - acc) / seg;
      out.push(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
      target += step;
    }
    acc += seg;
  }
  // exact endpoint: ring seam duplicate or the open line's last point
  out.push(points[(n - 1) * 2], points[(n - 1) * 2 + 1]);
  return out;
}
