import { BufferAttribute, BufferGeometry } from 'three';
import type { Isoline } from './isolines';

/**
 * Triangular cross-section: the minimum geometry with a silhouette from every
 * viewing angle (a flat ribbon vanishes edge-on). At line widths of a few
 * pixels the cross-section shape is invisible — same trick as Lusion's hero.
 */
const SEGMENT_COUNT = 3;

/**
 * Expand contour polylines into tube geometry (port of Lusion's
 * AboutHeroLines expansion). The position attribute holds the tube CENTER
 * (y = normalized level height); the normal holds the radial direction. The
 * vertex shader scales y by elevation and inflates by normal * radius, so
 * elevation, lift, and thickness all stay live-tunable without a rebuild.
 *
 * Arc length and total path length drive the pulse and global intro reveal.
 */
export function buildContourTubeGeometry(lines: Isoline[]): BufferGeometry {
  let vertexCount = 0;
  let indexCount = 0;
  for (const line of lines) {
    const n = line.points.length / 2;
    vertexCount += n * SEGMENT_COUNT;
    indexCount += (n - 1) * SEGMENT_COUNT * 6;
  }

  const position = new Float32Array(vertexCount * 3);
  const normal = new Float32Array(vertexCount * 3);
  const t = new Float32Array(vertexCount);
  const totalLength = new Float32Array(vertexCount);
  const lineId = new Float32Array(vertexCount);
  const major = new Float32Array(vertexCount);
  const travelDirection = new Float32Array(vertexCount);
  const shadow = new Float32Array(vertexCount);
  const index = new Uint32Array(indexCount);

  let v = 0; // vertex cursor
  let f = 0; // index cursor

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const pts = line.points;
    const n = pts.length / 2;
    const y = line.levelValue;
    let arc = 0;

    for (let i = 0; i < n; i++) {
      const x = pts[i * 2];
      const z = pts[i * 2 + 1];

      if (i > 0) arc += Math.hypot(x - pts[i * 2 - 2], z - pts[i * 2 - 1]);

      // Central-difference tangent; closed rings (seam point duplicated)
      // wrap so both seam vertices get identical frames — no crack.
      let ip = i - 1;
      let inx = i + 1;
      if (line.closed) {
        if (ip < 0) ip = n - 2;
        if (inx > n - 1) inx = 1;
      } else {
        if (ip < 0) ip = 0;
        if (inx > n - 1) inx = n - 1;
      }
      let tx = pts[inx * 2] - pts[ip * 2];
      let tz = pts[inx * 2 + 1] - pts[ip * 2 + 1];
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl;
      tz /= tl;

      // Horizontal tangent ⇒ frame is simply up and side = up × tangent.
      // ring normal k: up·cos(θk) + side·sin(θk), θk = k·2π/3
      const sx = tz;
      const sz = -tx;

      for (let k = 0; k < SEGMENT_COUNT; k++) {
        const theta = (k / SEGMENT_COUNT) * Math.PI * 2;
        const cu = Math.cos(theta);
        const cs = Math.sin(theta);

        position[v * 3] = x;
        position[v * 3 + 1] = y;
        position[v * 3 + 2] = z;
        normal[v * 3] = sx * cs;
        normal[v * 3 + 1] = cu;
        normal[v * 3 + 2] = sz * cs;
        t[v] = arc;
        totalLength[v] = line.totalLength;
        lineId[v] = li;
        major[v] = line.major ? 1 : 0;
        travelDirection[v] = line.travelDirection;
        shadow[v] = line.shadow ? 1 : 0;

        if (i < n - 1) {
          const wrap = k === SEGMENT_COUNT - 1 ? 1 - SEGMENT_COUNT : 1;
          index[f++] = v;
          index[f++] = v + wrap;
          index[f++] = v + SEGMENT_COUNT;
          index[f++] = v + wrap;
          index[f++] = v + SEGMENT_COUNT + wrap;
          index[f++] = v + SEGMENT_COUNT;
        }
        v++;
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('normal', new BufferAttribute(normal, 3));
  geometry.setAttribute('t', new BufferAttribute(t, 1));
  geometry.setAttribute('totalLength', new BufferAttribute(totalLength, 1));
  geometry.setAttribute('lineId', new BufferAttribute(lineId, 1));
  geometry.setAttribute('major', new BufferAttribute(major, 1));
  geometry.setAttribute('travelDirection', new BufferAttribute(travelDirection, 1));
  geometry.setAttribute('shadow', new BufferAttribute(shadow, 1));
  geometry.setIndex(new BufferAttribute(index, 1));
  return geometry;
}
