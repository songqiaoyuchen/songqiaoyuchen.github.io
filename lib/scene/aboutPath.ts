// About experience path maths: the route along the ridge, its checkpoints and the camera pose framing each one.
import {CatmullRomCurve3, Vector3, type PerspectiveCamera, type Vector3Tuple} from 'three';
import type {CameraPose} from '@/config/scene/camera';

/** Plan distance between route samples, so the draped tube follows the terrain whatever the waypoint spacing. */
const SAMPLE_SPACING = 0.02;
const MIN_SAMPLES_PER_SPAN = 4;

type PlanPoint = readonly [number, number];

export type RoutePlan = {
  /** Plan samples along the smooth route through the waypoints; y is 0. */
  samples: Vector3[];
  /** Index of the first sample of each span between consecutive waypoints. */
  spanStarts: number[];
};

export type AboutRoute = {
  /** Surface points along the route, first checkpoint to last. */
  points: Vector3[];
  /** World position of each checkpoint, on the route. */
  stops: Vector3[];
  /** Share of the route's length at which each checkpoint sits, 0 to 1. */
  stopFractions: number[];
  length: number;
};

/** The smooth route through the plan-view waypoints, sampled about SAMPLE_SPACING apart. */
export function sampleRoutePlan(waypoints: readonly PlanPoint[]): RoutePlan {
  const plan = new CatmullRomCurve3(
    waypoints.map(([x, z]) => new Vector3(x, 0, z)),
    false,
    'centripetal',
  );
  const spans = Math.max(waypoints.length - 1, 1);
  const samples: Vector3[] = [];
  const spanStarts: number[] = [];
  for (let span = 0; span < spans; span++) {
    const [fromX, fromZ] = waypoints[span];
    const [toX, toZ] = waypoints[Math.min(span + 1, waypoints.length - 1)];
    const count = Math.max(MIN_SAMPLES_PER_SPAN, Math.ceil(Math.hypot(toX - fromX, toZ - fromZ) / SAMPLE_SPACING));
    spanStarts.push(samples.length);
    for (let step = 0; step < count; step++) {
      samples.push(plan.getPoint((span + step / count) / spans));
    }
  }
  samples.push(plan.getPoint(1));
  return {samples, spanStarts};
}

/** The span (index of its first waypoint) a sample lies in. */
export function spanOfSample({spanStarts}: RoutePlan, sampleIndex: number): number {
  let span = 0;
  while (span + 1 < spanStarts.length && spanStarts[span + 1] <= sampleIndex) span++;
  return span;
}

/** Index of the sample nearest `point` in plan, among samples `from` to `to` inclusive. */
export function nearestSample(
  samples: readonly Vector3[],
  [x, z]: PlanPoint,
  from = 0,
  to = samples.length - 1,
): number {
  let nearest = from;
  for (let index = from; index <= to; index++) {
    if (Math.hypot(samples[index].x - x, samples[index].z - z)
      < Math.hypot(samples[nearest].x - x, samples[nearest].z - z)) nearest = index;
  }
  return nearest;
}

/** Each checkpoint's sample index: the nearest sample at or after the previous checkpoint's, keeping their order. */
export function snapCheckpoints(samples: readonly Vector3[], checkpoints: readonly PlanPoint[]): number[] {
  let from = 0;
  return checkpoints.map((checkpoint) => {
    from = nearestSample(samples, checkpoint, from);
    return from;
  });
}

/**
 * Smooth route through the plan-view waypoints, draped over the terrain and trimmed to run
 * from the first checkpoint to the last. `heightAt` returns the surface height.
 */
export function buildAboutRoute(
  waypoints: readonly PlanPoint[],
  checkpoints: readonly PlanPoint[],
  heightAt: (x: number, z: number) => number,
): AboutRoute {
  const {samples} = sampleRoutePlan(waypoints);
  const stopIndices = snapCheckpoints(samples, checkpoints);

  const first = stopIndices[0];
  const points = samples.slice(first, stopIndices.at(-1)! + 1).map((point) => {
    point.y = heightAt(point.x, point.z);
    return point;
  });
  const distances = [0];
  for (let index = 1; index < points.length; index++) {
    distances.push(distances[index - 1] + points[index].distanceTo(points[index - 1]));
  }
  const length = distances.at(-1)!;
  return {
    points,
    stops: stopIndices.map((index) => points[index - first].clone()),
    stopFractions: stopIndices.map((index) => distances[index - first] / Math.max(length, 0.0001)),
    length,
  };
}

export type AltitudeMark = {
  position: Vector3;
  /** Plan direction of the contour line at the mark, for setting the figure along it. */
  tangent: Vector3;
  label: string;
};

type ContourLevels = {
  /** Normalized terrain height of the lowest and highest point, as the contour builder sees them. */
  min: number;
  span: number;
  count: number;
};

type AltitudeOptions = {
  spacing: number;
  offset: number;
  /** Label every nth contour level. */
  levelEvery: number;
  datum: number;
  metresPerHeight: number;
};

/**
 * Map-style altitude figures beside the route: every `spacing` along it, a point `offset` to
 * alternating sides is walked along the slope onto the nearest labelled contour (evenly spaced
 * levels, every `levelEvery`th), and labelled with that level's height in invented metres.
 * `normalizedHeightAt` is the terrain's normalized height; `heightAt` its world height.
 */
export function placeAltitudeMarks(
  route: AboutRoute,
  normalizedHeightAt: (x: number, z: number) => number,
  heightAt: (x: number, z: number) => number,
  levels: ContourLevels,
  options: AltitudeOptions,
): AltitudeMark[] {
  const labelLevels: number[] = [];
  for (let level = 0; level < levels.count; level += options.levelEvery) {
    labelLevels.push(levels.min + levels.span * ((level + 0.5) / levels.count));
  }
  const step = 0.02;
  const marks: AltitudeMark[] = [];
  let travelled = 0;
  let next = options.spacing / 2;
  let side = 1;

  for (let index = 1; index < route.points.length; index++) {
    const from = route.points[index - 1];
    const to = route.points[index];
    travelled += Math.hypot(to.x - from.x, to.z - from.z);
    if (travelled < next) continue;
    next += options.spacing;
    side = -side;

    const direction = new Vector3(to.x - from.x, 0, to.z - from.z).normalize();
    let x = to.x - direction.z * options.offset * side;
    let z = to.z + direction.x * options.offset * side;
    const startX = x;
    const startZ = z;
    const height = normalizedHeightAt(x, z);
    const target = labelLevels.reduce((best, level) => (
      Math.abs(level - height) < Math.abs(best - height) ? level : best
    ));
    // Newton steps down or up the slope onto the contour line.
    let gradientX = 0;
    let gradientZ = 0;
    for (let iteration = 0; iteration < 6; iteration++) {
      const current = normalizedHeightAt(x, z);
      gradientX = (normalizedHeightAt(x + step, z) - normalizedHeightAt(x - step, z)) / (2 * step);
      gradientZ = (normalizedHeightAt(x, z + step) - normalizedHeightAt(x, z - step)) / (2 * step);
      const slope = gradientX * gradientX + gradientZ * gradientZ;
      if (slope < 1e-8) break;
      x -= gradientX * (current - target) / slope;
      z -= gradientZ * (current - target) / slope;
    }

    const onLine = Math.abs(normalizedHeightAt(x, z) - target) < 0.002;
    const nearStart = Math.hypot(x - startX, z - startZ) < 0.35;
    const clearOfRoute = route.points.every((point) => Math.hypot(point.x - x, point.z - z) > 0.16);
    const clearOfMarks = marks.every(({position}) => Math.hypot(position.x - x, position.z - z) > 0.6);
    if (!onLine || !nearStart || !clearOfRoute || !clearOfMarks) continue;

    marks.push({
      position: new Vector3(x, heightAt(x, z), z),
      tangent: new Vector3(-gradientZ, 0, gradientX).normalize(),
      label: String(Math.round((options.datum + target * options.metresPerHeight) / 10) * 10),
    });
  }
  return marks;
}

/**
 * Frames one checkpoint from the About pose without turning the camera: a parallel shift
 * moves the checkpoint `follow` of the way toward `screen` (normalized device coordinates, as
 * seen by `camera` at the About pose), then a dolly along the camera-to-checkpoint ray zooms
 * in while keeping it there.
 */
export function getAboutFocusPose(
  base: CameraPose,
  camera: PerspectiveCamera,
  stop: Vector3,
  screen: readonly [number, number],
  follow: number,
  zoom: number,
): CameraPose {
  camera.position.fromArray(base.position);
  camera.lookAt(new Vector3(...base.lookAt));
  camera.updateMatrixWorld(true);
  // The point at the checkpoint's depth that the About pose shows where it should land.
  const projected = stop.clone().project(camera);
  const target = new Vector3(
    projected.x + (screen[0] - projected.x) * follow,
    projected.y + (screen[1] - projected.y) * follow,
    projected.z,
  ).unproject(camera);
  const offset = stop.clone().sub(target);
  const position = new Vector3(...base.position).add(offset);
  offset.add(stop.clone().sub(position).multiplyScalar(zoom));
  return {
    position: new Vector3(...base.position).add(offset).toArray() as Vector3Tuple,
    lookAt: new Vector3(...base.lookAt).add(offset).toArray() as Vector3Tuple,
  };
}
