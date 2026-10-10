// Checks the Travel globe maths (lib/scene/travel.ts): places on the sphere, turning a place to the camera,
// the snap servo against a real camera projection, coasting and capture, and track densifying.
import assert from 'node:assert/strict';
import {PerspectiveCamera, Vector3} from 'three';
import {getCameraPose} from '../../config/scene/camera.ts';
import {TRAVEL_CONFIG} from '../../config/scene/travel.ts';
import {
  advanceGlobe, aimForOffset, aimFromScreen, anglesToward, angularDistance, createGlobeState, decodeLines,
  densifyTrack, encodeLines, facingAngles, frontPlace, globeQuaternion, graticulePositions,
  lonLatToUnit, markerScreenFor, nearestPlace, offsetForMarker, planetScale, polylineLength, regionSpread,
  releaseGlobe,
  toGlobeSettings, trackGaps, viewFromCamera,
} from '../../lib/scene/travel.ts';
import {placeTripSheet} from '../../components/travel/useTripSheetPlacement.ts';
import {
  geoJsonLines, gpxTrack, mercatorTile, sampleRegion, simplifyLine, zoomForResolution,
} from '../assets/build-travel-geo.mjs';

const DEG = Math.PI / 180;
const center = new Vector3(...TRAVEL_CONFIG.center);
const radius = TRAVEL_CONFIG.radius;
const places = [[5.279, 44.174], [104.07, 30.67], [-21.9, 64.15], [151.2, -33.87], [-0.13, 51.5]];

// Places sit on the unit sphere; north is up, longitude 0 faces +Z, east is +X.
assert.ok(Math.abs(lonLatToUnit([0, 0]).distanceTo(new Vector3(0, 0, 1))) < 1e-12);
assert.ok(Math.abs(lonLatToUnit([90, 0]).distanceTo(new Vector3(1, 0, 0))) < 1e-12);
assert.ok(Math.abs(lonLatToUnit([0, 90]).distanceTo(new Vector3(0, 1, 0))) < 1e-12);
assert.ok(Math.abs(angularDistance([0, 0], [90, 0]) - 90) < 1e-9);
assert.ok(Math.abs(angularDistance([0, 0], [0, 45]) - 45) < 1e-9);

function cameraAt(pose, aspect = 1.6) {
  const camera = new PerspectiveCamera(38, aspect, 0.1, 100);
  camera.position.fromArray(pose.position);
  camera.lookAt(new Vector3(...pose.lookAt));
  camera.updateMatrixWorld(true);
  return camera;
}

// A camera looking straight at the globe's centre: facingAngles turns any place to the screen's centre.
const straight = cameraAt({position: [-4, 19, -9], lookAt: TRAVEL_CONFIG.center});
const view = viewFromCamera(center, straight.position);
for (const place of places) {
  const {yaw, pitch} = facingAngles(place, view);
  const world = lonLatToUnit(place).multiplyScalar(radius).applyQuaternion(globeQuaternion(yaw, pitch, view))
    .add(center);
  const seen = world.clone().project(straight);
  assert.ok(Math.abs(seen.x) < 1e-6 && Math.abs(seen.y) < 1e-6, `faces the camera: ${place}`);
  // ...and reads back as the place in front.
  const front = frontPlace(yaw, pitch, view);
  assert.ok(angularDistance(front, place) < 1e-6, `front place: ${place}`);
}

// nearestPlace honours the capture angle.
assert.equal(nearestPlace(places, [4, 45], 35), 0);
assert.equal(nearestPlace(places, [60, 10], 35), -1);
assert.equal(nearestPlace(places, [60, 10], 360), 1);

// The servo lands a place on an off-centre screen point from the real Travel pose, from either side of the globe,
// high latitudes included.
const travel = cameraAt(getCameraPose('travel'));
const travelView = viewFromCamera(center, travel.position);
const settings = toGlobeSettings(TRAVEL_CONFIG);
// A fixed offset well inside the globe's outline: the configured one is tuned by hand and may sit near its limb.
const MARKER_OFFSET = [0.25, 0.15];
const markerScreen = markerScreenFor(travel, center, radius, MARKER_OFFSET);
const aim = aimForOffset(travel, center, radius, MARKER_OFFSET);
assert.ok(Math.abs(aim.length() - 1) < 1e-9);
// The aim is where that screen point meets the sphere, right and up of the globe's centre.
{
  const seen = aim.clone().multiplyScalar(radius).add(center).project(travel);
  assert.ok(Math.abs(seen.x - markerScreen[0]) < 1e-6 && Math.abs(seen.y - markerScreen[1]) < 1e-6);
  const globe = center.clone().project(travel);
  assert.ok(seen.x > globe.x && seen.y > globe.y);
  // A point off the globe aims at its outline.
  const edge = aimFromScreen(travel, center, radius, [globe.x + 2, globe.y]);
  assert.ok(Math.abs(edge.length() - 1) < 1e-9);
}
const seenAt = (state, index) => lonLatToUnit(places[index]).multiplyScalar(radius)
  .applyQuaternion(globeQuaternion(state.yaw, state.pitch, travelView)).add(center).project(travel);
for (const place of places) {
  const {yaw, pitch} = anglesToward(place, aim, travelView, settings.maxPitch);
  const world = lonLatToUnit(place).multiplyScalar(radius).applyQuaternion(globeQuaternion(yaw, pitch, travelView))
    .add(center);
  assert.ok(world.clone().sub(center).normalize().distanceTo(aim) < 1e-6, `anglesToward reaches the aim: ${place}`);
}
for (const [index, startYaw] of [[0, 0], [1, Math.PI], [2, 2.5], [3, -1]]) {
  const state = createGlobeState(startYaw, 0.3);
  const input = {dragging: false, locked: index, aim, reducedMotion: false};
  let frames = 0;
  while (frames++ < 600 && advanceGlobe(state, 1 / 60, settings, places, travelView, input) !== 'resting');
  assert.ok(frames < 600, `servo settles on place ${index}`);
  const seen = seenAt(state, index);
  assert.ok(Math.abs(seen.x - markerScreen[0]) < 0.01 && Math.abs(seen.y - markerScreen[1]) < 0.01,
    `place ${index} at the marker point: ${seen.x}, ${seen.y}`);
  assert.equal(state.active, index);
  assert.ok(Math.abs(state.pitch) <= settings.maxPitch + 1e-9);
}

// Reduced motion lands in a few frames.
{
  const state = createGlobeState(1, 0);
  const input = {dragging: false, locked: 4, aim, reducedMotion: true};
  let frames = 0;
  while (frames++ < 10 && advanceGlobe(state, 1 / 60, settings, places, travelView, input) !== 'resting');
  assert.ok(frames <= 10, 'reduced motion settles at once');
}

// A fast flick coasts past nearby places; a slow one is captured by the nearest within reach.
{
  const free = {dragging: false, locked: -1, aim, reducedMotion: false};
  const fast = createGlobeState(facingAngles(places[0], travelView).yaw, 0);
  releaseGlobe(fast, 6, 0);
  let phase = advanceGlobe(fast, 1 / 60, settings, places, travelView, free);
  assert.equal(phase, 'coasting');
  const startYaw = fast.yaw;
  for (let frame = 0; frame < 120 && (phase === 'coasting'); frame++) {
    phase = advanceGlobe(fast, 1 / 60, settings, places, travelView, free);
  }
  assert.ok(Math.abs(fast.yaw - startYaw) > 0.5, 'a flick travels well past the first place');

  const slowFacing = facingAngles(places[1], travelView);
  const slow = createGlobeState(slowFacing.yaw + 0.25, slowFacing.pitch);
  releaseGlobe(slow, -0.5, 0);
  phase = 'coasting';
  for (let frame = 0; frame < 600 && phase !== 'resting'; frame++) {
    phase = advanceGlobe(slow, 1 / 60, settings, places, travelView, free);
  }
  assert.equal(phase, 'resting');
  assert.equal(slow.active, 1, 'a slow release lands on the nearest place');
}

// With nothing in reach the globe comes to rest free, then drifts after the idle time; a drag clears everything.
{
  const free = {dragging: false, locked: -1, aim, reducedMotion: false};
  const state = createGlobeState(facingAngles([60, 10], travelView).yaw, 0);
  releaseGlobe(state, 0.05, 0);
  let phase = 'coasting';
  for (let frame = 0; frame < 600 && phase !== 'resting'; frame++) {
    phase = advanceGlobe(state, 1 / 60, settings, places, travelView, free);
  }
  assert.equal(state.active, -1);
  const yawBefore = state.yaw;
  for (let frame = 0; frame < 60 * 4; frame++) {
    phase = advanceGlobe(state, 1 / 60, settings, places, travelView, free);
  }
  assert.equal(phase, 'drifting');
  assert.ok(state.yaw > yawBefore);
  const drag = {...free, dragging: true};
  assert.equal(advanceGlobe(state, 1 / 60, settings, places, travelView, drag), 'dragging');
  assert.equal(state.target, -1);
}

// Pitch never exceeds the limit, from a drag or from coasting.
{
  const free = {dragging: false, locked: -1, aim, reducedMotion: false};
  const state = createGlobeState(0, 0);
  releaseGlobe(state, 0, 8);
  for (let frame = 0; frame < 120; frame++) {
    advanceGlobe(state, 1 / 60, settings, places, travelView, free);
  }
  assert.ok(state.pitch <= settings.maxPitch + 1e-9);
}

// Tracks densify along great circles and stay on the sphere; gaps join consecutive recordings end to start.
{
  const track = [[104.07, 30.67], [91.13, 29.65]];
  const points = densifyTrack(track, 0.5);
  assert.ok(points.length > 20);
  points.forEach((point) => assert.ok(Math.abs(point.length() - 1) < 1e-9));
  assert.ok(Math.abs(polylineLength(points) - angularDistance(track[0], track[1]) * DEG) < 1e-3,
    'about the central angle');
  const gaps = trackGaps([[[1, 1], [2, 2]], [[5, 5], [6, 6]], [[9, 9]]]);
  assert.deepEqual(gaps, [[[2, 2], [5, 5]], [[6, 6], [9, 9]]]);
  assert.deepEqual(trackGaps([[[1, 1]]]), []);
}

// Coastline files round-trip (to a hundredth of a degree) and come back as line segments; the bake script
// simplifies on the sphere and reads GPX recordings in order.
{
  const lines = [[[0, 0], [1, 0.5], [2, 1]], [[100.123456, -20.5]], [[-179.99, 89.9], [179.99, 89.9]]];
  const encoded = encodeLines(lines);
  assert.equal(encoded.length, (3 + 1 + 2 + 3) * 2);
  const segments = decodeLines(encoded);
  // Two segments from the first line, none from the single point, one from the last: 3 segments * 6 values.
  assert.equal(segments.length, 3 * 6);
  const expected = lonLatToUnit([1, 0.5]);
  assert.ok(Math.abs(segments[3] - expected.x) < 1e-3 && Math.abs(segments[4] - expected.y) < 1e-3);
  assert.ok(graticulePositions(15).length > 0);

  const wiggle = [[0, 0], [0.5, 0.001], [1, 0], [1.5, 0.3], [2, 0]];
  assert.deepEqual(simplifyLine(wiggle, 1), [[0, 0], [1, 0], [1.5, 0.3], [2, 0]]);
  assert.equal(simplifyLine(wiggle, 1000).length, 2);
  assert.deepEqual(geoJsonLines({type: 'FeatureCollection', features: [
    {type: 'Feature', geometry: {type: 'LineString', coordinates: [[1, 2], [3, 4]]}},
    {type: 'Feature', geometry: {type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]]}},
  ]}), [[[1, 2], [3, 4]], [[0, 0], [1, 0], [1, 1], [0, 0]]]);
  const gpx = '<gpx><trk><trkseg><trkpt lat="30.67" lon="104.07"><ele>500</ele></trkpt>'
    + '<trkpt lon="103.5" lat="30.2"/></trkseg></trk></gpx>';
  assert.deepEqual(gpxTrack(gpx), [[104.07, 30.67], [103.5, 30.2]]);
}

// The zoom-out's planet: Earth-sized for the landscape's claimed width, shrinking geometrically to the globe.
{
  const start = planetScale(20, 22, 3, 0);
  assert.ok(Math.abs(start.metresPerUnit - 909.09) < 0.01);
  assert.ok(Math.abs(start.startRadius - 7008.1) < 0.1);
  assert.equal(start.scale, 1);
  const end = planetScale(20, 22, 3, 1);
  assert.ok(Math.abs(end.radius - 3) < 1e-9);
  assert.ok(Math.abs(end.scale - 3 / start.startRadius) < 1e-12);
  const half = planetScale(20, 22, 3, 0.5);
  assert.ok(Math.abs(half.radius - Math.sqrt(3 * start.startRadius)) < 1e-6, 'geometric midpoint');
  assert.ok(planetScale(60, 22, 3, 0).startRadius < start.startRadius, 'a wider landscape means a smaller planet');
  // The 600 km tile at 1024 px is read 33 texels wide by its edge, one global-map texel (2048 px round the equator).
  assert.ok(Math.abs(regionSpread(600, 1024, 1 / 2048) - 33.36) < 0.01);
  // Terrarium tiles: Web Mercator and the zoom for a wanted resolution.
  const tile = mercatorTile(0, 0, 1);
  assert.ok(Math.abs(tile.x - 1) < 1e-12 && Math.abs(tile.y - 1) < 1e-12);
  assert.equal(zoomForResolution(600_000 / 1024, 30), 8);
  const flat = sampleRegion(() => 42, 102, 30, 600, 4);
  assert.equal(flat.length, 16);
  assert.ok(flat.every((value) => value === 42));
}

// A marker offset measured back from the point the aim lands on is the offset asked for.
{
  const camera = cameraAt(getCameraPose('travel'));
  const offset = [0.25, 0.15];
  const marker = center.clone().addScaledVector(aimForOffset(camera, center, radius, offset), radius);
  const measured = offsetForMarker(camera, center, radius, marker);
  assert.ok(Math.abs(measured[0] - offset[0]) < 1e-6 && Math.abs(measured[1] - offset[1]) < 1e-6);
}

// The trip panel spans from the globe's centre column to the gutter, never nearer it than the preferred column,
// with the float's box bounding the globe's outline (a little grown for the glow) and its polygon inside that box.
{
  const page = {width: 1280, height: 704, padTop: 96, gutter: 40};
  const ring = (x, y, r) => ({x, y, points: Array.from({length: 24}, (_, i) =>
    [x + r * Math.cos(i / 24 * Math.PI * 2), y + r * Math.sin(i / 24 * Math.PI * 2)]).flat()});
  const placed = placeTripSheet(ring(300, 900, 950), page, 512);
  assert.equal(placed.left, 300);
  assert.equal(placed.width, 1280 - 40 - 300);
  assert.equal(placed.top, 96);
  assert.ok(Math.abs(placed.shape.left + placed.shape.width / 2 - (300 - 300)) < 1e-6, 'box centred on the globe');
  assert.ok(Math.abs(placed.shape.top + placed.shape.height / 2 - (900 - 96)) < 1e-6);
  assert.ok(placed.shape.width > 1900 && placed.shape.width < 2000, 'grown a little for the glow');
  assert.equal(placed.shape.polygon.length, 48);
  assert.ok(placed.shape.polygon.every((value) => value >= -1e-6 && value <= placed.shape.width + 1e-6));
  const far = placeTripSheet(ring(1100, 352, 200), page, 512);
  assert.equal(far.left, 1280 - 40 - 512, 'no nearer the gutter than the column');
  const offLeft = placeTripSheet(ring(-100, 352, 200), page, 512);
  assert.equal(offLeft.left, 40, 'never left of the gutter');
}

console.log('travel globe checks passed');
