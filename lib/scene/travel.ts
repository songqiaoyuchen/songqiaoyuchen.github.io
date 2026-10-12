// Travel globe maths: places on the sphere, the globe's yaw/pitch turn toward the camera, coasting and the snap
// servo that lands it on a trip, and tracks densified along great circles.
// Framework-free apart from three's maths, so scripts/test can check it.
import {Quaternion, Vector3, type Camera, type PerspectiveCamera} from 'three';
import type {LonLat} from '@/data/travel';

const DEG = Math.PI / 180;
const UP = new Vector3(0, 1, 0);
const TAU = Math.PI * 2;

/** Unit vector of a place on the globe: +Y north, longitude 0 toward +Z, east toward +X. */
export function lonLatToUnit([lon, lat]: LonLat, out = new Vector3()) {
  const phi = lat * DEG;
  const lambda = lon * DEG;
  return out.set(Math.cos(phi) * Math.sin(lambda), Math.sin(phi), Math.cos(phi) * Math.cos(lambda));
}

/** Central angle between two places, degrees. */
export function angularDistance(a: LonLat, b: LonLat) {
  const dot = Math.sin(a[1] * DEG) * Math.sin(b[1] * DEG)
    + Math.cos(a[1] * DEG) * Math.cos(b[1] * DEG) * Math.cos((a[0] - b[0]) * DEG);
  return Math.acos(Math.min(1, Math.max(-1, dot))) / DEG;
}

/** Smallest signed turn from one angle to another, radians. */
export function wrapAngle(delta: number) {
  return delta - Math.round(delta / TAU) * TAU;
}

/**
 * How the camera sees the globe: its azimuth about the globe's axis (radians, from +Z toward +X), its elevation
 * above the globe's horizontal plane, and the horizontal axis the globe pitches about (the camera's right).
 */
export type GlobeView = {
  azimuth: number;
  elevation: number;
  pitchAxis: Vector3;
};

export function createGlobeView(): GlobeView {
  return {azimuth: Math.PI, elevation: 0, pitchAxis: new Vector3(-1, 0, 0)};
}

export function viewFromCamera(center: Vector3, cameraPosition: Vector3, out = createGlobeView()) {
  const dx = cameraPosition.x - center.x;
  const dy = cameraPosition.y - center.y;
  const dz = cameraPosition.z - center.z;
  const horizontal = Math.hypot(dx, dz);
  out.azimuth = Math.atan2(dx, dz);
  out.elevation = Math.atan2(dy, horizontal);
  // cross(up, toward camera): the camera's right, kept horizontal.
  out.pitchAxis.set(dz, 0, -dx).divideScalar(Math.max(horizontal, 1e-6));
  return out;
}

/** The yaw (about the globe's axis) and pitch (about the view's pitch axis) that turn a place to face the camera. */
export function facingAngles(place: LonLat, view: GlobeView) {
  return {
    yaw: wrapAngle(view.azimuth - place[0] * DEG),
    pitch: place[1] * DEG - view.elevation,
  };
}

/** The globe's rotation for a yaw and pitch: yaw first about +Y, then pitch about the view's axis. */
export function globeQuaternion(yaw: number, pitch: number, view: GlobeView, out = new Quaternion()) {
  const spin = new Quaternion().setFromAxisAngle(UP, yaw);
  return out.setFromAxisAngle(view.pitchAxis, pitch).multiply(spin);
}

/** The place the globe has turned to the camera at this yaw and pitch, degrees. */
export function frontPlace(yaw: number, pitch: number, view: GlobeView): LonLat {
  return [wrapAngle(view.azimuth - yaw) / DEG, (pitch + view.elevation) / DEG];
}

/** Index of the place nearest `front` within `within` degrees, or -1. */
export function nearestPlace(places: readonly LonLat[], front: LonLat, within: number) {
  let best = -1;
  let bestDistance = within;
  places.forEach((place, index) => {
    const distance = angularDistance(place, front);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}

/** Rotation feel, in radians and seconds (TRAVEL_CONFIG holds the degree values). */
export type GlobeSettings = {
  friction: number;
  snapBelow: number;
  capture: number;
  snapRate: number;
  maxPitch: number;
  idleDrift: number;
  idleAfter: number;
};

export function toGlobeSettings(config: {
  friction: number; snapBelow: number; capture: number; snapRate: number; maxPitch: number;
  idleDrift: number; idleAfter: number;
}): GlobeSettings {
  return {
    friction: config.friction,
    snapBelow: config.snapBelow * DEG,
    capture: config.capture,
    snapRate: config.snapRate,
    maxPitch: config.maxPitch * DEG,
    idleDrift: config.idleDrift * DEG,
    idleAfter: config.idleAfter,
  };
}

export type GlobePhase = 'dragging' | 'coasting' | 'snapping' | 'resting' | 'drifting';

export type GlobeState = {
  yaw: number;
  pitch: number;
  /** Angular velocity, radians per second. */
  vYaw: number;
  vPitch: number;
  /** The trip the servo is turning to, or -1. */
  target: number;
  /** The trip the globe rests on, or -1. */
  active: number;
  /** The trip a coast or drag would land on, or -1. */
  candidate: number;
  /** Seconds since the globe was last touched or moved by itself. */
  idle: number;
  phase: GlobePhase;
};

export function createGlobeState(yaw = 0, pitch = 0): GlobeState {
  return {yaw, pitch, vYaw: 0, vPitch: 0, target: -1, active: -1, candidate: -1, idle: 0, phase: 'resting'};
}

/**
 * The direction (from the globe's centre, unit length) of the point on the sphere seen at `screen` (normalized
 * device coordinates). A screen point off the globe aims at the nearest point of its outline.
 */
export function aimFromScreen(
  camera: Camera,
  center: Vector3,
  radius: number,
  screen: readonly [number, number],
  out = new Vector3(),
) {
  const origin = camera.position;
  const direction = new Vector3(screen[0], screen[1], 0.5).unproject(camera).sub(origin).normalize();
  const toOrigin = origin.clone().sub(center);
  const b = toOrigin.dot(direction);
  const discriminant = b * b - (toOrigin.lengthSq() - radius * radius);
  const along = discriminant >= 0 ? -b - Math.sqrt(discriminant) : -b;
  return out.copy(origin).addScaledVector(direction, along).sub(center).normalize();
}

/** The globe's centre and radius as the camera draws them, normalized device coordinates. */
export function projectGlobe(camera: PerspectiveCamera, center: Vector3, radius: number) {
  const seen = center.clone().project(camera);
  const radiusY = radius / (camera.position.distanceTo(center) * Math.tan(camera.fov * DEG / 2));
  return {x: seen.x, y: seen.y, radiusX: radiusY / camera.aspect, radiusY};
}

/** Screen point `offset` (shares of the globe's radius, right and up) from the globe's centre. */
export function markerScreenFor(
  camera: PerspectiveCamera,
  center: Vector3,
  radius: number,
  offset: readonly [number, number],
): [number, number] {
  const globe = projectGlobe(camera, center, radius);
  return [globe.x + offset[0] * globe.radiusX, globe.y + offset[1] * globe.radiusY];
}

/** The marker offset (shares of the globe's radius, right and up) at which the camera draws a world point. */
export function offsetForMarker(
  camera: PerspectiveCamera,
  center: Vector3,
  radius: number,
  marker: Vector3,
): [number, number] {
  const globe = projectGlobe(camera, center, radius);
  const seen = marker.clone().project(camera);
  return [(seen.x - globe.x) / globe.radiusX, (seen.y - globe.y) / globe.radiusY];
}

/** The aim (aimFromScreen) for a marker offset from the globe's centre. */
export function aimForOffset(
  camera: PerspectiveCamera,
  center: Vector3,
  radius: number,
  offset: readonly [number, number],
  out = new Vector3(),
) {
  return aimFromScreen(camera, center, radius, markerScreenFor(camera, center, radius, offset), out);
}

/**
 * The yaw and pitch that turn `place` to the world direction `aim`. Yaw (about +Y) keeps a place's height,
 * so the pitch is whichever turn about the view's axis brings the aim to that height; of the two, the smaller.
 * A place too near a pole cannot reach an aim far to the side (a north-up globe never tilts sideways); it then
 * comes as close as the axes allow.
 */
export function anglesToward(place: LonLat, aim: Vector3, view: GlobeView, maxPitch: number) {
  const unit = lonLatToUnit(place);
  const axis = view.pitchAxis;
  // Height of the aim turned back by theta about the axis: A cos(theta) + B sin(theta).
  const a = aim.y;
  const b = axis.z * aim.x - axis.x * aim.z;
  const magnitude = Math.max(Math.hypot(a, b), 1e-9);
  const base = Math.atan2(b, a);
  const spread = Math.acos(Math.min(1, Math.max(-1, unit.y / magnitude)));
  const first = wrapAngle(base + spread);
  const second = wrapAngle(base - spread);
  const theta = Math.abs(second) < Math.abs(first) ? second : first;
  const pitch = Math.min(maxPitch, Math.max(-maxPitch, -theta));
  const turnedBack = aim.clone().applyAxisAngle(axis, -pitch);
  const yaw = wrapAngle(Math.atan2(turnedBack.x, turnedBack.z) - Math.atan2(unit.x, unit.z));
  return {yaw, pitch};
}

export type GlobeInput = {
  dragging: boolean;
  /** Trip pinned by the route (a selected trip), or -1. */
  locked: number;
  /** Where a locked or captured trip should sit: the direction of its screen point on the sphere (aimFromScreen). */
  aim: Vector3;
  reducedMotion: boolean;
};

const REST_SPEED = 0.6 * DEG;
const SETTLED = 0.002;

/** One frame of the globe left to itself: the servo while a trip is targeted, else coasting, capture and idle drift.
 * Dragging is applied by the caller before this runs; it only records that a drag is in progress. */
export function advanceGlobe(
  state: GlobeState,
  dt: number,
  settings: GlobeSettings,
  places: readonly LonLat[],
  view: GlobeView,
  input: GlobeInput,
) {
  const clampPitch = () => {
    state.pitch = Math.min(settings.maxPitch, Math.max(-settings.maxPitch, state.pitch));
  };
  if (input.dragging) {
    clampPitch();
    state.vYaw = state.vPitch = 0;
    state.target = -1;
    state.active = -1;
    state.idle = 0;
    state.candidate = nearestPlace(places, frontPlace(state.yaw, state.pitch, view), settings.capture);
    state.phase = 'dragging';
    return state.phase;
  }
  if (input.locked >= 0 && state.target !== input.locked
    && (state.phase === 'resting' || state.phase === 'drifting' || state.phase === 'snapping' || state.active < 0)) {
    state.target = input.locked;
    state.vYaw = state.vPitch = 0;
  }

  if (state.target >= 0) {
    const index = state.target;
    const gain = input.reducedMotion ? 1 : 1 - Math.exp(-settings.snapRate * dt);
    const goal = anglesToward(places[index], input.aim, view, settings.maxPitch);
    // The aim moves with the camera, so the goal is solved afresh every frame and eased toward.
    state.yaw += wrapAngle(goal.yaw - state.yaw) * gain;
    state.pitch += (goal.pitch - state.pitch) * gain;
    clampPitch();
    const error = Math.hypot(wrapAngle(goal.yaw - state.yaw), goal.pitch - state.pitch);
    state.candidate = index;
    state.idle = 0;
    if (error < SETTLED) {
      state.yaw = goal.yaw;
      state.pitch = goal.pitch;
      state.active = index;
      state.phase = 'resting';
    } else {
      state.phase = 'snapping';
    }
    return state.phase;
  }

  const speed = Math.hypot(state.vYaw, state.vPitch);
  if (speed > REST_SPEED) {
    state.yaw += state.vYaw * dt;
    state.pitch += state.vPitch * dt;
    const before = state.pitch;
    clampPitch();
    if (state.pitch !== before) state.vPitch = 0;
    const decay = Math.exp(-settings.friction * dt);
    state.vYaw *= decay;
    state.vPitch *= decay;
    state.active = -1;
    state.idle = 0;
    state.candidate = nearestPlace(places, frontPlace(state.yaw, state.pitch, view), settings.capture);
    state.phase = 'coasting';
    if (speed < settings.snapBelow && state.candidate >= 0) {
      state.target = state.candidate;
      state.vYaw = state.vPitch = 0;
    }
    return state.phase;
  }

  state.vYaw = state.vPitch = 0;
  state.idle += dt;
  if (state.active < 0 && state.idle > settings.idleAfter && settings.idleDrift > 0 && !input.reducedMotion) {
    state.yaw += settings.idleDrift * dt;
    state.candidate = nearestPlace(places, frontPlace(state.yaw, state.pitch, view), settings.capture);
    state.phase = 'drifting';
    return state.phase;
  }
  if (state.active < 0) state.candidate = -1;
  state.phase = 'resting';
  return state.phase;
}

/** Lets go of a drag: coast with the pointer's last angular velocity (radians per second). */
export function releaseGlobe(state: GlobeState, vYaw: number, vPitch: number, maxSpeed = 10) {
  const speed = Math.hypot(vYaw, vPitch);
  const scale = speed > maxSpeed ? maxSpeed / speed : 1;
  state.vYaw = vYaw * scale;
  state.vPitch = vPitch * scale;
  state.phase = 'coasting';
}

/**
 * The trip in the globe's focus zone: the one with a point (its place, or anywhere along its route) nearest the
 * globe's front, within `within` degrees. Purely where the globe stands, whatever the servo is doing; the trip
 * already in focus keeps it until it leaves by `release` degrees more, so the zone's edge does not flicker.
 * `points` are unit vectors per trip and `front` the unit direction toward the camera, both in globe space.
 */
export function focusedTrip(
  points: readonly (readonly Vector3[])[],
  front: Vector3,
  within: number,
  release: number,
  current: number,
) {
  const nearest = points.map((trip) => trip.reduce((best, point) => Math.max(best, point.dot(front)), -1));
  if (current >= 0 && current < points.length && nearest[current] >= Math.cos((within + release) * DEG)) {
    return current;
  }
  let best = -1;
  let bestCosine = Math.cos(within * DEG);
  nearest.forEach((cosine, index) => {
    if (cosine > bestCosine) {
      bestCosine = cosine;
      best = index;
    }
  });
  return best;
}

/**
 * Places nearer each other than `within` degrees, chained (a place joins a group when it is near any member), as
 * groups of indices; each group in index order, the groups by their first index. A place on its own is a group of one.
 */
export function clusterPlaces(places: readonly LonLat[], within: number) {
  const root = places.map((_, index) => index);
  const find = (index: number): number => (root[index] === index ? index : (root[index] = find(root[index])));
  for (let a = 0; a < places.length; a++) {
    for (let b = a + 1; b < places.length; b++) {
      if (angularDistance(places[a], places[b]) > within) continue;
      const [first, second] = [find(a), find(b)].sort((x, y) => x - y);
      root[second] = first;
    }
  }
  const groups = new Map<number, number[]>();
  places.forEach((_, index) => {
    const key = find(index);
    groups.set(key, [...(groups.get(key) ?? []), index]);
  });
  return [...groups.values()].sort((a, b) => a[0] - b[0]);
}

/** Points along a track, following the great circle between recorded places every `stepDegrees` at most. */
export function densifyTrack(track: readonly LonLat[], stepDegrees: number) {
  const points: Vector3[] = [];
  const from = new Vector3();
  const to = new Vector3();
  for (let index = 0; index < track.length; index++) {
    if (index === 0) {
      points.push(lonLatToUnit(track[0]));
      continue;
    }
    lonLatToUnit(track[index - 1], from);
    lonLatToUnit(track[index], to);
    const angle = from.angleTo(to);
    const steps = Math.max(1, Math.ceil(angle / (stepDegrees * DEG)));
    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      // Spherical interpolation keeps every sample on the sphere.
      const point = angle < 1e-6
        ? to.clone()
        : from.clone().multiplyScalar(Math.sin((1 - t) * angle) / Math.sin(angle))
          .addScaledVector(to, Math.sin(t * angle) / Math.sin(angle));
      points.push(point);
    }
  }
  return points;
}

/** The gaps between one recording's end and the next one's start, as two-place tracks. */
export function trackGaps(segments: readonly (readonly LonLat[])[]) {
  const gaps: LonLat[][] = [];
  for (let index = 1; index < segments.length; index++) {
    const previous = segments[index - 1];
    const next = segments[index];
    if (!previous.length || !next.length) continue;
    gaps.push([previous[previous.length - 1], next[0]]);
  }
  return gaps;
}

/** Coastline file format (public/travel/coast.bin): Int16 pairs of longitude and latitude in hundredths of a
 * degree, each line ended by a pair whose longitude is LINE_END. */
export const COAST_SCALE = 100;
export const LINE_END = 32767;

export function encodeLines(lines: readonly (readonly LonLat[])[]) {
  const values: number[] = [];
  for (const line of lines) {
    for (const [lon, lat] of line) values.push(Math.round(lon * COAST_SCALE), Math.round(lat * COAST_SCALE));
    values.push(LINE_END, 0);
  }
  return new Int16Array(values);
}

/** Unit-sphere positions for LineSegments (two points per segment), from an encoded coastline file. */
export function decodeLines(data: Int16Array) {
  const positions: number[] = [];
  const previous = new Vector3();
  const current = new Vector3();
  let open = false;
  for (let index = 0; index + 1 < data.length; index += 2) {
    if (data[index] === LINE_END) {
      open = false;
      continue;
    }
    lonLatToUnit([data[index] / COAST_SCALE, data[index + 1] / COAST_SCALE], current);
    if (open) positions.push(previous.x, previous.y, previous.z, current.x, current.y, current.z);
    previous.copy(current);
    open = true;
  }
  return new Float32Array(positions);
}

/** Graticule as unit-sphere LineSegments positions: meridians and parallels every `stepDegrees`. */
export function graticulePositions(stepDegrees: number, sampleDegrees = 2) {
  const lines: LonLat[][] = [];
  for (let lon = -180; lon < 180; lon += stepDegrees) {
    const line: LonLat[] = [];
    for (let lat = -90; lat <= 90; lat += sampleDegrees) line.push([lon, lat]);
    lines.push(line);
  }
  for (let lat = -90 + stepDegrees; lat < 90; lat += stepDegrees) {
    const line: LonLat[] = [];
    for (let lon = -180; lon <= 180; lon += sampleDegrees) line.push([lon, lat]);
    lines.push(line);
  }
  return decodeLines(encodeLines(lines));
}

export const EARTH_RADIUS_KM = 6371;

/** The regional tile's texels per texel of the global elevation map (`mapTexel` as a share of its width). */
export function regionSpread(regionKm: number, regionSize: number, mapTexel: number) {
  return 2 * Math.PI * EARTH_RADIUS_KM * mapTexel / (regionKm / regionSize);
}

/**
 * The zoom-out's scale: the planet the landscape sits on, sized so that `planeSize` world units of landscape span
 * `landscapeKm` of real ground, shrinks geometrically to the globe's radius as the morph runs 0 to 1. `scale` is
 * world units on the planet per world unit of landscape at that moment; `metresPerUnit` converts the landscape's
 * own heights to metres above its datum.
 */
export function planetScale(landscapeKm: number, planeSize: number, globeRadius: number, morph: number) {
  const metresPerUnit = landscapeKm * 1000 / planeSize;
  const startRadius = EARTH_RADIUS_KM * 1000 / metresPerUnit;
  const radius = startRadius * Math.pow(globeRadius / startRadius, Math.min(1, Math.max(0, morph)));
  return {startRadius, radius, scale: radius / startRadius, metresPerUnit};
}

/**
 * The zoom-out's landing point along a camera ray: how far from the camera, along the unit ray, a planet of the
 * given radius must have its surface, the surface normal there at the given cosine to the ray (negative where the
 * surface faces the camera), for the camera to stand `height` above that surface. Placing the planet about the
 * camera this way keeps the camera outside it for any height above zero.
 */
export function rideDistance(radius: number, cosine: number, height: number) {
  const grazing = radius * cosine;
  return grazing + Math.sqrt(grazing * grazing + height * (2 * radius + height));
}

/** Whether the globe's body, a sphere of `radius` about the origin, stands between a point above it and the eye
 * (both in globe space). Relief is left out: trails and markers ride it but hide only past the horizon (the trail
 * shader, travelTrail.vert, makes the same test). */
export function behindGlobe(point: Vector3, eye: Vector3, radius: number) {
  const dx = eye.x - point.x;
  const dy = eye.y - point.y;
  const dz = eye.z - point.z;
  const a = dx * dx + dy * dy + dz * dz;
  const b = 2 * (point.x * dx + point.y * dy + point.z * dz);
  const c = point.lengthSq() - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc <= 0) return false;
  const enter = (-b - Math.sqrt(disc)) / (2 * a);
  return enter > 0 && enter < 1;
}

/** Arc length of a polyline, world units. */
export function polylineLength(points: readonly Vector3[]) {
  let length = 0;
  for (let index = 1; index < points.length; index++) length += points[index].distanceTo(points[index - 1]);
  return length;
}

