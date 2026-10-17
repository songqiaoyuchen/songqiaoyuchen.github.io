// Checks the intro's contour map (lib/intro/mapField.ts) and the mark's paths (lib/intro/markPaths.ts): the rings
// parse closed and nested, the field is the mark's distance near it, and the isolines close around it.
import assert from 'node:assert/strict';
import {buildMapField, distanceToPolyline, insidePolygon, levelCount, traceIsoline} from '../../lib/intro/mapField.ts';
import {MARK_VIEW_BOX, markRings} from '../../lib/intro/markPaths.ts';

const rings = markRings();
assert.equal(rings.length, 5);
for (const ring of rings) {
  assert.ok(ring.length >= 4, 'a ring has points');
  assert.deepEqual(ring[0], ring[ring.length - 1], 'a ring is closed');
  for (const [x, y] of ring) {
    assert.ok(x >= MARK_VIEW_BOX.x && x <= MARK_VIEW_BOX.x + MARK_VIEW_BOX.width, `x ${x} inside the viewBox`);
    assert.ok(y >= MARK_VIEW_BOX.y && y <= MARK_VIEW_BOX.y + MARK_VIEW_BOX.height, `y ${y} inside the viewBox`);
  }
}
// The rings nest: each inner ring's first point lies inside the outer ring.
for (let index = 1; index < rings.length; index++) {
  const [x, y] = rings[index][0];
  assert.ok(insidePolygon(x, y, rings[0]), `ring ${index} inside the outer ring`);
}

// A square outline in a small field: outside, the field is the distance with no wobble.
const square = [[20, 20], [40, 20], [40, 40], [20, 40], [20, 20]];
assert.equal(distanceToPolyline(30, 10, square), 10);
assert.equal(distanceToPolyline(50, 50, square), Math.hypot(10, 10));
assert.ok(insidePolygon(30, 30, square) && !insidePolygon(10, 30, square));
const flat = buildMapField(60, 60, square, {scale: 1, wobble: 0});
assert.ok(Math.abs(flat.data[10 * 60 + 30] - 10) < 1e-6, 'the field is the distance to the outline');
assert.ok(flat.data[30 * 60 + 30] < 0, 'negative inside the mark');
assert.ok(Math.abs(flat.max - Math.hypot(20, 20)) < 1e-6, 'the far corner (0, 0) is the farthest cell');

// Isolines of the flat field are closed loops around the square: every segment end meets another segment.
const spacing = 5;
assert.ok(levelCount(flat, spacing) >= 3);
const segments = traceIsoline(flat, 10);
assert.ok(segments.length >= 4 * 4, 'the isoline at 10 has segments');
const ends = new Map();
const key = (x, y) => `${x.toFixed(4)},${y.toFixed(4)}`;
for (let index = 0; index < segments.length; index += 4) {
  for (const point of [[segments[index], segments[index + 1]], [segments[index + 2], segments[index + 3]]]) {
    const k = key(...point);
    ends.set(k, (ends.get(k) ?? 0) + 1);
    assert.ok(Math.abs(distanceToPolyline(point[0], point[1], square) - 10) < 0.75, 'on the offset of the outline');
  }
}
for (const count of ends.values()) assert.equal(count % 2, 0, 'every isoline end meets another');

// Wobble bends the lines but keeps them near the mark's shape close in.
const bent = buildMapField(60, 60, square, {scale: 1, wobble: 1});
assert.ok(Math.abs(bent.data[10 * 60 + 30] - 10) < 16 * 1.01, 'near the mark the wander is small');

console.log('map field ok');
