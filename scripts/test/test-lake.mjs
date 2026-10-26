// Checks the lake dive's crack (lib/scene/lake.ts): a route of the asked length descending from under the lake,
// walls closed at both ends, a point on the centre line always inside, an idle craft kept inside (nothing steers
// it), and a craft steered along the route reaching the bottle.
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {LAKE_CONFIG, LAKE_DIVE_CONFIG} from '../../config/scene/lake.ts';
import {
  advanceCraft, createCraft, createLocus, CrackRoute, directionPitch, directionYaw, headingDirection, wrapAngle,
} from '../../lib/scene/lake.ts';

const route = new CrackRoute(LAKE_DIVE_CONFIG, LAKE_CONFIG);
const {stations} = route;
assert.equal(stations.length, Math.round(LAKE_DIVE_CONFIG.length / LAKE_DIVE_CONFIG.stationSpacing) + 1);
assert.ok(Math.abs(stations[0].position.x - LAKE_CONFIG.center[0]) < 1e-6, 'starts under the lake');
assert.ok(stations[stations.length - 1].position.y < stations[0].position.y - 60, 'descends well below the lake');
for (const station of stations) {
  assert.ok(Math.abs(station.wide.y) < 1e-6, 'the slot stays level');
  assert.ok(Math.abs(station.wide.dot(station.tangent)) < 1e-6);
  assert.ok(Math.abs(station.narrow.dot(station.tangent)) < 1e-6);
}

// The route bends gently and runs straight into the chamber.
for (let i = 2; i < stations.length - 2; i++) {
  const turn = Math.abs(wrapAngle(directionYaw(stations[i + 2].tangent) - directionYaw(stations[i - 2].tangent)));
  assert.ok(turn < 0.2, `no sharp bend (${turn.toFixed(2)} rad over ${(4 * LAKE_DIVE_CONFIG.stationSpacing).toFixed(1)} units at s=${stations[i].s})`);
}
const endFrom = stations.findIndex((station) => station.s >= LAKE_DIVE_CONFIG.length - LAKE_DIVE_CONFIG.straightEnd + 8);
for (let i = endFrom; i < stations.length - 1; i++) {
  const turn = Math.abs(wrapAngle(directionYaw(stations[i + 1].tangent) - directionYaw(stations[endFrom].tangent)));
  assert.ok(turn < 0.12, `the end runs straight (${turn.toFixed(2)} rad at s=${stations[i].s})`);
}
// The end wall stands across the trench: the gap holds almost to the last station, then closes.
assert.ok(route.radius(0, LAKE_DIVE_CONFIG.length - 2) > 3, 'the gap holds up to the end wall');

// Walls: closed at the ends, open in the middle, never negative; the faces either side are near, the floor and
// the lake bed far off.
assert.ok(route.radius(0, 0) < 0.1, 'closed at the start');
assert.ok(route.radius(1, LAKE_DIVE_CONFIG.length) < 0.1, 'closed at the end');
let least = Infinity;
for (let s = 6; s < LAKE_DIVE_CONFIG.length - 6; s += 0.5) {
  for (let theta = 0; theta < Math.PI * 2; theta += 0.3) least = Math.min(least, route.radius(theta, s));
}
assert.ok(least > 1.15, `the trench never closes mid-way (narrowest ${least.toFixed(2)})`);
assert.ok(route.radius(Math.PI / 2, 60) > 30 && route.radius(-Math.PI / 2, 60) > 30, 'void above and below');
assert.ok(route.radius(0, 60) < 6 && route.radius(Math.PI, 60) < 6, 'faces near either side');
// A face stands near-vertical most of its height: at a third of the way up it is still about the gap away.
const upTheta = Math.atan2(12, LAKE_DIVE_CONFIG.halfWidth[1]);
assert.ok(route.radius(upTheta, 60) * Math.cos(upTheta) < LAKE_DIVE_CONFIG.halfWidth[1] * 1.6, 'faces stand up');

// Points on the centre line are inside; a point far out is outside.
const locus = createLocus();
for (let s = 5; s < LAKE_DIVE_CONFIG.length - 5; s += 7) {
  const station = stations[Math.round(s / LAKE_DIVE_CONFIG.stationSpacing)];
  route.locate(station.position, locus);
  assert.ok(locus.rho < 0.05 && locus.radius > 1, `centre line inside at ${s}`);
  const outside = station.position.clone().addScaledVector(station.wide, 40);
  route.locate(outside, locus);
  assert.ok(locus.rho > locus.radius, `far point outside at ${s}`);
  // The wall is where the readout says it is.
  const right = route.wallDistance(station.position, station.wide, 40, locus);
  assert.ok(right > 1 && right < 40, `the wall is some way off (${right.toFixed(2)})`);
  const probe = station.position.clone().addScaledVector(station.wide, right - 0.2);
  route.locate(probe, locus);
  assert.ok(locus.rho < locus.radius, 'just short of the wall is inside');
  probe.copy(station.position).addScaledVector(station.wide, right + 0.2);
  route.locate(probe, locus);
  assert.ok(locus.rho > locus.radius, 'just past the wall is outside');
}

// Geometry: inward normals.
const geometry = route.buildGeometry();
assert.equal(geometry.positions.length, stations.length * LAKE_DIVE_CONFIG.ringSegments * 3);
const mid = Math.floor(stations.length / 2) * LAKE_DIVE_CONFIG.ringSegments + 7;
const p = new Vector3().fromArray(geometry.positions, mid * 3);
const n = new Vector3().fromArray(geometry.normals, mid * 3);
const c = stations[Math.floor(stations.length / 2)].position;
assert.ok(n.dot(c.clone().sub(p)) > 0, 'normals point into the crack');

// The faces are rock, not smooth walls: along a face at the craft's height the wall comes and goes by a good
// fraction of a unit over a few units of route; the ring's vertices are close together where the faces meet the
// gap, so that relief is carried by the mesh.
const faceTheta = Math.atan2(1.5, LAKE_DIVE_CONFIG.halfWidth[0]);
let reliefMin = Infinity, reliefMax = -Infinity;
for (let s = 60; s < 70; s += 0.25) {
  const r = route.radius(faceTheta, s) * Math.cos(faceTheta);
  reliefMin = Math.min(reliefMin, r);
  reliefMax = Math.max(reliefMax, r);
}
assert.ok(reliefMax - reliefMin > 0.4, `the faces carry relief (${(reliefMax - reliefMin).toFixed(2)} units over 10)`);
const ring = LAKE_DIVE_CONFIG.ringSegments;
const gapVertex = Math.floor(stations.length / 2) * ring + ring / 4; // the right face at the route's own height
const gapSpacing = new Vector3().fromArray(geometry.positions, (gapVertex + 1) * 3)
  .distanceTo(new Vector3().fromArray(geometry.positions, gapVertex * 3));
assert.ok(gapSpacing < 0.25, `ring vertices close together near the gap (${gapSpacing.toFixed(2)} units)`);
assert.ok(ring % 2 === 0, 'two faces of equal vertex count');

// The bottle rests inside the chamber.
const {bottle} = route;
route.locate(bottle, locus);
assert.ok(locus.rho < locus.radius - 0.5, 'bottle inside the chamber');
assert.ok(locus.s > LAKE_DIVE_CONFIG.length - LAKE_DIVE_CONFIG.chamber - 1, 'bottle near the end');

// A craft driven by nothing else runs into a wall and stays inside, never past the route's ends.
const idle = createCraft(route);
for (let i = 0; i < 60 * 60; i++) {
  advanceCraft(idle, {yaw: 0, pitch: 0}, route, locus, 1 / 60, LAKE_DIVE_CONFIG.speed, LAKE_DIVE_CONFIG);
  route.locate(idle.position, locus);
  assert.ok(locus.rho <= locus.radius + 1e-3, 'idle craft stays inside');
  assert.ok(locus.s >= 0 && locus.s <= route.length, 'idle craft stays on the route');
}

// A craft steered along the route (toward its direction, in the chamber toward the bottle) reaches the bottle.
const craft = createCraft(route);
let bumps = 0;
let seconds = 0;
const start = craft.position.clone();
const aim = new Vector3();
while (seconds < 150) {
  route.locate(craft.position, locus, craft.hint);
  if (locus.s > route.length - LAKE_DIVE_CONFIG.chamber - 2) aim.subVectors(bottle, craft.position).normalize();
  else aim.copy(locus.tangent);
  // Right input lowers the yaw, so a wanted increase in yaw is a left input.
  const yawError = wrapAngle(directionYaw(aim) - craft.yaw);
  const pitchError = directionPitch(aim) - craft.pitch;
  const input = {yaw: Math.max(-1, Math.min(1, -yawError * 3)), pitch: Math.max(-1, Math.min(1, pitchError * 3))};
  if (advanceCraft(craft, input, route, locus, 1 / 60, LAKE_DIVE_CONFIG.speed, LAKE_DIVE_CONFIG)) bumps++;
  seconds += 1 / 60;
  if (craft.position.distanceTo(bottle) < LAKE_DIVE_CONFIG.reach) break;
}
assert.ok(craft.position.distanceTo(bottle) < LAKE_DIVE_CONFIG.reach,
  `steered craft reaches the bottle (${seconds.toFixed(0)} s, ${craft.position.distanceTo(bottle).toFixed(1)} off)`);
assert.ok(bumps < 60 * 6, `steered craft bumps little (${bumps} frames)`);
assert.ok(craft.position.y < start.y - 50, 'the craft went down');

// A craft steered hard left stays inside and slides; the heading is free, so it can turn right round, which is
// how a corner is left.
const steered = createCraft(route);
let turnedBack = false;
for (let i = 0; i < 60 * 30; i++) {
  advanceCraft(steered, {yaw: -1, pitch: -1}, route, locus, 1 / 60, LAKE_DIVE_CONFIG.speed, LAKE_DIVE_CONFIG);
  route.locate(steered.position, locus);
  assert.ok(locus.rho <= locus.radius + 1e-3, 'steered craft never leaves the crack');
  if (Math.abs(wrapAngle(steered.yaw - directionYaw(locus.tangent))) > 2.5) turnedBack = true;
}
assert.ok(turnedBack, 'a held turn brings the craft right round');
assert.ok(headingDirection(steered.yaw, steered.pitch).length() > 0.99);

console.log(`ok: lake route ${route.length} units, ${stations.length} stations, steered dive ${seconds.toFixed(0)} s, ${bumps} bump frames`);
