// Matrix maths for the gallery transition: cubic-bezier easing, affine decompose/compose, slerp.
// Screen matrix = translate(x, y) · perspective(m34) · model, for a CLONE-wide image (measure.ts).
export type Pose = {x: number; y: number; m34: number; model: DOMMatrix};

export type Parts = {t: number[]; q: number[]; s: number[]};

export const css = (curve: readonly number[]) => `cubic-bezier(${curve.join(', ')})`;

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function bezier([x1, y1, x2, y2]: readonly number[]) {
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x: number) => {
    let low = 0;
    let high = 1;
    for (let i = 0; i < 20; i++) {
      const mid = (low + high) / 2;
      if (at(x1, x2, mid) < x) low = mid;
      else high = mid;
    }
    return at(y1, y2, (low + high) / 2);
  };
}

// Affine matrix → translation, rotation quaternion and axis scales (no shear).
export function decompose(m: DOMMatrix): Parts {
  const columns = [[m.m11, m.m12, m.m13], [m.m21, m.m22, m.m23], [m.m31, m.m32, m.m33]];
  const s = columns.map((column) => Math.hypot(...column) || 1);
  const det = m.m11 * (m.m22 * m.m33 - m.m23 * m.m32) - m.m21 * (m.m12 * m.m33 - m.m13 * m.m32) +
    m.m31 * (m.m12 * m.m23 - m.m13 * m.m22);
  if (det < 0) s[0] = -s[0];
  const [[r00, r10, r20], [r01, r11, r21], [r02, r12, r22]] = columns.map((column, i) => column.map((v) => v / s[i]));
  const trace = r00 + r11 + r22;
  let q: number[];
  if (trace > 0) {
    const k = Math.sqrt(trace + 1) * 2;
    q = [(r21 - r12) / k, (r02 - r20) / k, (r10 - r01) / k, k / 4];
  } else if (r00 > r11 && r00 > r22) {
    const k = Math.sqrt(1 + r00 - r11 - r22) * 2;
    q = [k / 4, (r01 + r10) / k, (r02 + r20) / k, (r21 - r12) / k];
  } else if (r11 > r22) {
    const k = Math.sqrt(1 + r11 - r00 - r22) * 2;
    q = [(r01 + r10) / k, k / 4, (r12 + r21) / k, (r02 - r20) / k];
  } else {
    const k = Math.sqrt(1 + r22 - r00 - r11) * 2;
    q = [(r02 + r20) / k, (r12 + r21) / k, k / 4, (r10 - r01) / k];
  }
  return {t: [m.m41, m.m42, m.m43], q, s};
}

export function compose({t, q: [x, y, z, w], s}: Parts) {
  return new DOMMatrix([
    (1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y + z * w) * s[0], 2 * (x * z - y * w) * s[0], 0,
    2 * (x * y - z * w) * s[1], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z + x * w) * s[1], 0,
    2 * (x * z + y * w) * s[2], 2 * (y * z - x * w) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ]);
}

export function slerp(a: number[], b: number[], t: number) {
  let dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const sign = dot < 0 ? -1 : 1;
  dot *= sign;
  if (dot > 0.9995) {
    const q = a.map((v, i) => lerp(v, sign * b[i], t));
    const length = Math.hypot(...q);
    return q.map((v) => v / length);
  }
  const angle = Math.acos(dot);
  const wa = Math.sin((1 - t) * angle) / Math.sin(angle);
  const wb = sign * Math.sin(t * angle) / Math.sin(angle);
  return a.map((v, i) => v * wa + b[i] * wb);
}

export function mixParts(a: Parts, b: Parts, t: number): Parts {
  return {t: a.t.map((v, i) => lerp(v, b.t[i], t)), q: slerp(a.q, b.q, t), s: a.s.map((v, i) => lerp(v, b.s[i], t))};
}

export function screen({x, y, m34, model}: Pose) {
  const perspective = new DOMMatrix();
  perspective.m34 = m34;
  return new DOMMatrix().translate(x, y).multiply(perspective).multiply(model);
}

export function matrix3d(matrix: DOMMatrix) {
  return `matrix3d(${Array.from(matrix.toFloat64Array()).join(',')})`;
}
