// Checks the intro reveal's reach field (lib/terrain/reach.ts): the summit is the origin (or the highest point
// near the asked-for one), distances across the plain stay close to Euclidean, and a ridge between two points is
// counted as a climb.
import assert from 'node:assert/strict';
import {buildReachField} from '../../lib/terrain/reach.ts';

const options = {planeSize: 20, elevation: 10, contrast: 1, seaLevel: 0, downsample: 1};
const width = 81;
const height = 81;

function grid(heightAt) {
  const data = new Float32Array(width * height);
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      // Column 0 is x = -10, row 0 is z = +10.
      const x = (column / (width - 1)) * 20 - 10;
      const z = 10 - (row / (height - 1)) * 20;
      data[row * width + column] = heightAt(x, z);
    }
  }
  return {data, width, height};
}

function at(field, x, z) {
  const column = Math.round((x + 10) / 20 * (field.width - 1));
  const row = Math.round((10 - z) / 20 * (field.height - 1));
  return field.data[row * field.width + column];
}

const near = (a, b) => Math.abs(a - b) < 1e-6;

// A single low bump at (2, -3) on a flat plain: the origin is the bump and the plain is measured straight.
const bump = (x, z) => (Math.abs(x - 2) < 0.2 && Math.abs(z + 3) < 0.2 ? 0.0005 : 0);
const peak = buildReachField(grid(bump), options);
assert(near(peak.origin[0], 2) && near(peak.origin[1], -3), 'The summit is the origin');
assert.equal(at(peak, 2, -3), 0);
for (const [x, z] of [[-8, -3], [2, 7], [-6, 6], [9, -9]]) {
  const euclid = Math.hypot(x - 2, z + 3);
  const reach = at(peak, x, z);
  assert(reach >= euclid - 1e-6, 'Reach is never shorter than the straight line');
  assert(reach < euclid * 1.03, `Plain reach ${reach} within 3% of ${euclid}`);
}
assert(peak.max > 15 && peak.max < 19, 'The far corner is the furthest point');

// A ridge wall across the plain at x = 0, 5 world units high, with a higher spike at (5, 0): a point beyond the
// wall is reached by climbing over, about 10 units further than a point as far away on the same side.
const wall = (x, z) => (Math.abs(x) < 0.3 ? 0.5 : (Math.abs(x - 5) < 0.2 && Math.abs(z) < 0.2 ? 0.6 : 0));
const ridge = buildReachField(grid(wall), options);
assert(near(ridge.origin[0], 5) && near(ridge.origin[1], 0), 'The highest point wins over the ridge');
const extra = at(ridge, -5, 0) - at(ridge, 9, 0);
assert(extra > 14.5 && extra < 17, `Over the ridge counts the climb and descent (${extra})`);

// Asked for an origin near (-8, 8) within 3 units, the wave starts at the highest point there, not at the spike.
const local = buildReachField(grid((x, z) => wall(x, z) + (Math.abs(x + 7) < 0.2 && Math.abs(z - 9) < 0.2 ? 0.1 : 0)),
  {...options, origin: [-8, 8], originRadius: 3});
assert(near(local.origin[0], -7) && near(local.origin[1], 9), `Nearby summit ${local.origin}`);
assert.equal(at(local, -7, 9), 0);
// With no radius, the nearest cell to the asked-for point.
const exact = buildReachField(grid(wall), {...options, origin: [-8.1, 7.9], originRadius: 0});
assert(near(exact.origin[0], -8) && near(exact.origin[1], 8), `Nearest cell ${exact.origin}`);

console.log('reach field ok');
