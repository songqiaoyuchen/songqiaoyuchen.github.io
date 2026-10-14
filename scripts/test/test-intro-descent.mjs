// Checks the intro's descent maths (lib/scene/introDescent.ts): the map pose stands above the summit leaning
// back along the overview's heading, and the light and fog follow the descent between their ends.
import assert from 'node:assert/strict';
import {introFogScale, introLights, mapPose} from '../../lib/scene/introDescent.ts';

const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

// The overview heads along +z; the map pose leans back toward -z by height·tan(tilt).
const overview = {position: [0, 10, -10], lookAt: [0, 8, 0]};
const summit = [3, 11, 2];
const pose = mapPose(overview, summit, 20, 45);
assert.deepEqual(pose.lookAt, [3, 11, 2]);
assert.ok(near(pose.position[0], 3) && near(pose.position[1], 31) && near(pose.position[2], 2 - 20));
// No tilt: straight above.
assert.deepEqual(mapPose(overview, summit, 5, 0).position, [3, 16, 2]);
// A heading off the axes leans back along it.
const diagonal = mapPose({position: [0, 0, 0], lookAt: [1, 0, 1]}, [0, 0, 0], 10, 45);
assert.ok(near(diagonal.position[0], -10 / Math.SQRT2) && near(diagonal.position[2], -10 / Math.SQRT2));

assert.equal(introLights(0, [0.2, 0.8]), 0);
assert.equal(introLights(0.2, [0.2, 0.8]), 0);
assert.ok(near(introLights(0.5, [0.2, 0.8]), 0.5));
assert.equal(introLights(1, [0.2, 0.8]), 1);

assert.ok(near(introFogScale(0, 3), 3));
assert.ok(near(introFogScale(1, 3), 1));
assert.ok(near(introFogScale(0.5, 4), 2), 'geometric: halfway is the square root');

console.log('intro descent ok');
