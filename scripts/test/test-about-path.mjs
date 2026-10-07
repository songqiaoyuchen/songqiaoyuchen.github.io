// Checks the About route and checkpoint framing (lib/scene/aboutPath.ts).
import assert from 'node:assert/strict';
import {PerspectiveCamera, Vector3} from 'three';
import {getCameraPose} from '../../config/scene/camera.ts';
import {ABOUT_CHECKPOINTS, ABOUT_ROUTE} from '../../config/scene/aboutPath.ts';
import {buildAboutRoute, getAboutFocusPose, placeAltitudeMarks} from '../../lib/scene/aboutPath.ts';

const checkpoints = Object.values(ABOUT_CHECKPOINTS);
const heightAt = (x, z) => 7 + Math.sin(x) * 0.5 + z * 0.1;
const route = buildAboutRoute(ABOUT_ROUTE, checkpoints, heightAt);

// The route runs from the first checkpoint to the last, draped on the surface; every
// checkpoint snaps onto it near its configured position, in order along it.
route.points.forEach((point) => assert.ok(Math.abs(point.y - heightAt(point.x, point.z)) < 1e-9));
route.stops.forEach((stop, index) => {
  assert.ok(Math.hypot(stop.x - checkpoints[index][0], stop.z - checkpoints[index][1]) < 0.1);
});
assert.equal(route.stopFractions[0], 0);
assert.ok(Math.abs(route.stopFractions.at(-1) - 1) < 1e-9);
route.stopFractions.slice(1).forEach((fraction, index) => assert.ok(fraction > route.stopFractions[index]));

// A checkpoint far off the route still lands on it, without reordering the others.
const offRoute = buildAboutRoute(ABOUT_ROUTE, [checkpoints[0], [5, 5], checkpoints.at(-1)], heightAt);
offRoute.stopFractions.slice(1).forEach((fraction, index) => assert.ok(fraction >= offRoute.stopFractions[index]));

function cameraAt(pose) {
  const camera = new PerspectiveCamera(38, 1.6, 0.1, 100);
  camera.position.fromArray(pose.position);
  camera.lookAt(new Vector3(...pose.lookAt));
  camera.updateMatrixWorld(true);
  return camera;
}

const base = getCameraPose('about');
const baseCamera = cameraAt(base);
const scratch = new PerspectiveCamera(38, 1.6, 0.1, 100);
const screen = [-0.45, -0.05];
route.stops.forEach((stop) => {
  const framed = cameraAt(getAboutFocusPose(base, scratch, stop, screen, 1, 0.3));
  // Framing never turns the camera, puts the checkpoint at the requested screen point, and closes in.
  assert.ok(framed.quaternion.angleTo(baseCamera.quaternion) < 1e-6);
  const onScreen = stop.clone().project(framed);
  assert.ok(Math.abs(onScreen.x - screen[0]) < 1e-6 && Math.abs(onScreen.y - screen[1]) < 1e-6);
  assert.ok(framed.position.distanceTo(stop) < baseCamera.position.distanceTo(stop));
  // Following part of the way lands the checkpoint that share of the way there.
  const before = stop.clone().project(baseCamera);
  const halfway = stop.clone().project(cameraAt(getAboutFocusPose(base, scratch, stop, screen, 0.5, 0.3)));
  assert.ok(Math.abs(halfway.x - (before.x + screen[0]) / 2) < 1e-6);
  assert.ok(Math.abs(halfway.y - (before.y + screen[1]) / 2) < 1e-6);
});

// Altitude figures sit on a labelled contour level, clear of the route, and read higher uphill.
const normalized = (x, z) => 0.3 + 0.04 * x + 0.02 * z;
const levels = {min: 0, span: 1, count: 64};
const marks = placeAltitudeMarks(route, normalized, heightAt, levels,
  {spacing: 0.9, offset: 0.42, levelEvery: 1, datum: 380, metresPerHeight: 6400});
assert.ok(marks.length > 2);
marks.forEach(({position, label}) => {
  const level = normalized(position.x, position.z) * levels.count - 0.5;
  assert.ok(Math.abs(level - Math.round(level)) < 0.2, 'on a contour level');
  assert.ok(route.points.every((point) => Math.hypot(point.x - position.x, point.z - position.z) > 0.16));
  assert.equal(label, String(Math.round((380 + normalized(position.x, position.z) * 6400) / 10) * 10));
});

console.log('about path: ok');
