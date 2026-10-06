// Checks camera journey rotation, arrival, retargeting and reduced motion (lib/scene/cameraTransition.ts).
import assert from 'node:assert/strict';
import {PerspectiveCamera, Vector3} from 'three';
import {CAMERA_CONFIG, getCameraPose} from '../../config/scene/camera.ts';
import {CameraTransition} from '../../lib/scene/cameraTransition.ts';

const seconds = CAMERA_CONFIG.transitionSeconds;
const pose = (id, mobile = false) => {
  const value = getCameraPose(id, mobile);
  return {position: new Vector3(...value.position), lookAt: new Vector3(...value.lookAt)};
};
function setup(start) {
  const camera = new PerspectiveCamera();
  camera.position.copy(start.position);
  camera.lookAt(start.lookAt);
  return {camera, focus: start.lookAt.clone(), transition: new CameraTransition()};
}
function journey(state, destination, delta = 1 / 60) {
  const {camera, focus, transition} = state;
  const start = camera.position.clone();
  const length = start.distanceTo(destination.position);
  transition.begin(camera, focus, destination.position, destination.lookAt);
  let settled = false;
  let frames = 0;
  let maxAngle = 0;
  let firstStep;
  let lastStep;
  while (!settled && frames++ < 1000) {
    const before = camera.quaternion.clone();
    const position = camera.position.clone();
    const remaining = position.distanceTo(destination.position);
    settled = transition.advance(camera, focus, delta, seconds, false);
    const angle = before.angleTo(camera.quaternion);
    maxAngle = Math.max(maxAngle, angle);
    assert(angle < 0.13, 'No abrupt angular jump, even for opposite viewing directions');
    assert(camera.position.distanceTo(destination.position) <= remaining + 1e-9);
    assert(focus.distanceTo(camera.position) > 0.001, 'Focus must not cross the camera');
    const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    assert(Math.abs(right.y) < 1e-8, 'Horizon must stay level');
    firstStep ??= camera.position.distanceTo(position);
    lastStep = camera.position.distanceTo(position);
  }
  assert(settled);
  assert(camera.position.distanceTo(destination.position) < 1e-10);
  assert(focus.distanceTo(destination.lookAt) < 1e-10);
  assert(firstStep < length * 0.001 && lastStep < length * 0.001,
    'Departure and arrival must ease without snapping');
  // OrbitControls reconstructs orientation from position/target: handoff must agree.
  const rotation = camera.quaternion.clone();
  camera.lookAt(focus);
  assert(rotation.angleTo(camera.quaternion) < 1e-7);
  return {frames, maxAngle};
}

for (const start of [pose(null), pose(null, true), pose('about'), pose('projects'), pose('blog')]) {
  for (const delta of [1 / 30, 1 / 60, 1 / 144]) {
    const state = setup(start);
    journey(state, pose('art'), delta);
    journey(state, start, delta);
  }
}
// Retarget from an actual intermediate pose, with no reset to the original section.
const interrupted = setup(pose(null));
interrupted.transition.begin(interrupted.camera, interrupted.focus, pose('art').position, pose('art').lookAt);
for (let frame = 0; frame < 40; frame++) {
  interrupted.transition.advance(interrupted.camera, interrupted.focus, 1 / 60, seconds, false);
}
const beforeRetarget = interrupted.camera.position.clone();
journey(interrupted, pose('about'));
assert(beforeRetarget.distanceTo(pose(null).position) > 1);

const stalled = setup(pose(null));
stalled.transition.begin(stalled.camera, stalled.focus, pose('art').position, pose('art').lookAt);
assert.equal(stalled.transition.advance(stalled.camera, stalled.focus, 10, seconds, false), false);
assert(stalled.camera.position.distanceTo(pose(null).position) < 0.01, 'Stalls must not teleport');
assert.equal(stalled.transition.advance(stalled.camera, stalled.focus, 0, seconds, true), true);
assert(stalled.camera.position.distanceTo(pose('art').position) < 1e-10);
assert(stalled.focus.distanceTo(pose('art').lookAt) < 1e-10);

// A straight interpolation of focus and position collapses at this midpoint.
journey(setup({position: new Vector3(0, 2, 10), lookAt: new Vector3(0, 2, 0)}),
  {position: new Vector3(0, 2, -10), lookAt: new Vector3(0, 2, 0)});
console.log('PASS: camera rotation, level horizon, arrival, return, retargeting, stalls and reduced motion');
