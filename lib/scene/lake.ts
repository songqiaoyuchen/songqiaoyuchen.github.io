// The lake dive's crack: the route winding down from under the lake, the walls about it, the craft's motion and the
// queries the sonar HUD makes of the walls. Framework-free apart from three's maths, so scripts/test can check it.
import {CatmullRomCurve3, Vector3} from 'three';
import type {LAKE_DIVE_CONFIG} from '@/config/scene/lake';

/** Where the lake lies: the route starts under its centre. */
export type LakeConfig = {readonly center: readonly [number, number]; readonly level: number};
/** The dive's numbers, widened so tuned values (Leva) can stand in for the config's literals. */
export type LakeDiveConfig = {
  readonly [K in keyof typeof LAKE_DIVE_CONFIG]: (typeof LAKE_DIVE_CONFIG)[K] extends number
    ? number : (typeof LAKE_DIVE_CONFIG)[K];
};

const TAU = Math.PI * 2;
const UP = new Vector3(0, 1, 0);

/** Smallest signed turn from one angle to another, radians. */
export function wrapAngle(delta: number) {
  return delta - Math.round(delta / TAU) * TAU;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash3(x: number, y: number, z: number) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 2147483647 ^ 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Value noise in 0..1, smooth across the lattice. */
function noise3(x: number, y: number, z: number) {
  const x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
  const fx = smooth(x - x0), fy = smooth(y - y0), fz = smooth(z - z0);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const c00 = lerp(hash3(x0, y0, z0), hash3(x0 + 1, y0, z0), fx);
  const c10 = lerp(hash3(x0, y0 + 1, z0), hash3(x0 + 1, y0 + 1, z0), fx);
  const c01 = lerp(hash3(x0, y0, z0 + 1), hash3(x0 + 1, y0, z0 + 1), fx);
  const c11 = lerp(hash3(x0, y0 + 1, z0 + 1), hash3(x0 + 1, y0 + 1, z0 + 1), fx);
  return lerp(lerp(c00, c10, fy), lerp(c01, c11, fy), fz);
}

/** Three octaves of value noise, -1..1. */
export function fbm3(x: number, y: number, z: number) {
  const n = noise3(x, y, z) * 0.5 + noise3(x * 2.1 + 5.2, y * 2.1 + 1.3, z * 2.1 + 9.7) * 0.3
    + noise3(x * 4.3 + 11.1, y * 4.3 + 7.9, z * 4.3 + 2.4) * 0.2;
  return n * 2 - 1;
}

export type Station = {
  s: number;
  position: Vector3;
  tangent: Vector3;
  /** The slot's level axis: the camera's right when looking down the route. */
  wide: Vector3;
  /** Across the slot: perpendicular to the route and the wide axis. */
  narrow: Vector3;
};

/** Where a point lies about the route: the frame there and the point's place in the cross-section. */
export type Locus = {
  index: number;
  s: number;
  u: number;
  v: number;
  rho: number;
  /** The wall's distance from the centre line in the point's direction. */
  radius: number;
  center: Vector3;
  tangent: Vector3;
  wide: Vector3;
  narrow: Vector3;
};

export function createLocus(): Locus {
  return {
    index: 0, s: 0, u: 0, v: 0, rho: 0, radius: 1,
    center: new Vector3(), tangent: new Vector3(0, -1, 0), wide: new Vector3(1, 0, 0), narrow: new Vector3(0, 0, 1),
  };
}

/** Direction of a heading: yaw about the up axis (0 toward +z), pitch above level. */
export function headingDirection(yaw: number, pitch: number, out = new Vector3()) {
  const level = Math.cos(pitch);
  return out.set(Math.sin(yaw) * level, Math.sin(pitch), Math.cos(yaw) * level);
}

export function directionYaw(direction: Vector3) {
  return Math.atan2(direction.x, direction.z);
}

export function directionPitch(direction: Vector3) {
  return Math.asin(Math.min(1, Math.max(-1, direction.y)));
}

// Scratch for the per-frame maths below, so the frame loop allocates nothing: each is used by one method only.
const OFFSET = new Vector3();
const SEGMENT = new Vector3();
const RELATIVE = new Vector3();
const MARCH = new Vector3();
const RADIAL = new Vector3();

export class CrackRoute {
  readonly stations: Station[] = [];
  /** Arc length of the route the craft may travel. */
  readonly length: number;
  /** Arc length of the walls: the open water runs on past the route's end, closing far beyond a scan's reach. */
  readonly end: number;
  readonly spacing: number;
  /** Where the bottle rests: on the basin's floor, a way into the basin. */
  readonly bottle: Vector3;
  private readonly config: LakeDiveConfig;

  constructor(config: LakeDiveConfig, lake: LakeConfig) {
    this.config = config;
    this.length = config.length;
    this.end = config.length + config.basinTail;
    this.spacing = config.stationSpacing;
    const random = mulberry32(config.seed);
    // Control points: a heading drifting in yaw, descending at the configured pitch, stepping down from under
    // the lake until the route is long enough (with slack for the spline's ends).
    const points: Vector3[] = [new Vector3(lake.center[0], lake.level - 2.5, lake.center[1])];
    let yaw = random() * TAU;
    let bend = 0;
    let travelled = 0;
    const direction = new Vector3();
    while (travelled < this.end + config.controlStep * 2) {
      // The bend drifts rather than jumps, is capped, and dies away over the straight run at the end.
      bend = Math.max(-config.yawBend, Math.min(config.yawBend, bend * 0.6 + (random() * 2 - 1) * config.yawWander));
      const straight = travelled > config.length - config.straightEnd - config.controlStep;
      yaw += straight ? 0 : bend;
      // The route levels out into the basin, so its floor lies more or less level too: gently, over a few control
      // steps, since the basin's wide rings would fold into each other round a tight bend.
      const levelling = Math.min(1, Math.max(0,
        (travelled - (config.length - config.basin - config.controlStep * 3)) / (config.controlStep * 3)));
      const wander = straight ? 0 : (random() * 2 - 1) * config.pitchWander;
      const pitch = config.pitch + wander + (config.basinPitch - config.pitch) * levelling;
      headingDirection(yaw, -pitch, direction);
      points.push(points[points.length - 1].clone().addScaledVector(direction, config.controlStep));
      travelled += config.controlStep;
    }
    const curve = new CatmullRomCurve3(points, false, 'centripetal');
    const total = curve.getLength();
    const count = Math.round(this.end / config.stationSpacing) + 1;
    for (let index = 0; index < count; index++) {
      const s = Math.min(index * config.stationSpacing, this.end);
      const t = Math.min(s / total, 1);
      const position = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      // The slot stays level: its wide axis is the horizontal perpendicular to the route (the route never dives
      // straight down, so this is always defined).
      const wide = new Vector3().crossVectors(tangent, UP).normalize();
      const narrow = new Vector3().crossVectors(wide, tangent).normalize();
      this.stations.push({s, position, tangent, wide, narrow});
    }
    this.bottle = this.bottlePosition();
  }

  /** How far into the basin s is, 0 before it and 1 within: the faces fall away about the mouth. */
  basinIn(s: number) {
    return smoothstep(this.length - this.config.basin - 8, this.length - this.config.basin + 6, s);
  }

  /** How far the floor has come up toward the basin's, 0 in the trench and 1 in the basin: a long, gentle slope. */
  floorIn(s: number) {
    const {basin, floorRise} = this.config;
    return smoothstep(this.length - basin - floorRise, this.length - basin + 6, s);
  }

  /**
   * Half-axes of the slot's ellipse at s along the route, before the wall noise: across the gap, up to the lake
   * bed, and down to the floor (far off in the trench, near in the basin).
   */
  axes(s: number): [number, number, number] {
    const {config: c} = this;
    const n = s / this.length;
    const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
    let a = c.halfWidth[0] + (c.halfWidth[1] - c.halfWidth[0])
      * clamp01(0.5 + 0.5 * Math.sin(s * 0.061 + 1.7) + 0.35 * fbm3(s * 0.05 + 3.1, 0.7, 0.2));
    const b = c.halfHeight[0] + (c.halfHeight[1] - c.halfHeight[0])
      * clamp01(0.5 + 0.5 * Math.sin(s * 0.083 + 0.4) + 0.3 * fbm3(s * 0.07 + 8.4, 0.1, 0.9));
    for (const [share, scale, spread] of c.pinches) {
      const d = (n - share) * this.length / spread;
      a *= 1 - (1 - scale) * Math.exp(-d * d);
    }
    // The basin: the floor comes up from the void over a long slope before the mouth, where the faces fall away
    // beyond the sonar's reach.
    const basinIn = this.basinIn(s);
    a += (c.basinHalfWidth - a) * basinIn;
    const bDown = b + (c.basinDepth - b) * this.floorIn(s);
    return [Math.max(a, 0.8), Math.max(b, 0.8), Math.max(bDown, 0.8)];
  }

  /**
   * The wall's distance from the centre line at angle theta (0 along the gap axis, toward the right face) and s
   * along the route: a squared-off slot whose two faces carry the rock's relief, by their height.
   */
  radius(theta: number, s: number) {
    const {config: c} = this;
    const [a, bUp, bDown] = this.axes(s);
    const cos = Math.cos(theta), sin = Math.sin(theta);
    const b = sin < 0 ? bDown : bUp;
    const p = c.slotPower;
    const slot = 1 / Math.pow(Math.pow(Math.abs(cos) / a, p) + Math.pow(Math.abs(sin) / b, p), 1 / p);
    // Where this point lies on a face: its height up the trench, for the relief and the ledges.
    const station = this.stations[Math.min(Math.max(Math.round(s / this.spacing), 0), this.stations.length - 1)];
    const up = slot * sin;
    const height = station.position.y + up * station.narrow.y;
    const side = cos < 0 ? 1 : 0;
    // Large bulges; blocks and spalls a unit or two across, their faces flattened and their edges sharp; finer
    // roughness; and ledges stepping in and out where the beds change, their edges wandering along the route.
    const n = fbm3(up * 0.12 + 7.1 + side * 13.7, s * c.wallDetail, 2.3);
    // The blocks fade out high up the faces, where the ring's vertices are too sparse to carry their edges (and
    // the sonar seldom reaches).
    const m = fbm3(up * c.wallMidDetail + side * 31.3, s * c.wallMidDetail + 2.2, 4.4);
    const block = smoothstep(-0.5, 0.5, m) * 2 - 1;
    const mid = (0.5 * m + 0.5 * block) * (1 - smoothstep(10, 22, Math.abs(up)));
    const fine = fbm3(up * 0.3 + 1.7 + side * 5.1, s * 0.2 + 4.0, 9.1);
    const band = height / c.terraceSpacing + 0.3 * fbm3(up * 0.05 + 2.0 + side * 3.3, s * 0.05, 6.0);
    // The ledges' steps soften high up the faces, for the same reason the blocks fade there.
    const soft = 0.15 + 0.3 * smoothstep(8, 20, Math.abs(up));
    const ledge = (smoothstep(0.5 - soft, 0.5 + soft, band - Math.floor(band)) - 0.5) * 2;
    // The relief belongs to the faces (the floor and the lake bed far off keep the slot's shape), and never takes
    // more than a share of the gap, so pinches stay passable.
    // The relief is a share of the radius, so where the basin's faces stand far out it is scaled back to the
    // trench's size in units, or its ledges would be slabs.
    const faceScale = Math.min(1, c.halfWidth[1] / a);
    const faces = (c.wallNoise * n + c.wallMid * mid + c.wallRoughness * fine + c.terrace * ledge)
      * Math.abs(cos) * faceScale;
    // The floor, as it comes up: low dunes and rubble.
    const floorness = Math.max(-sin, 0) * this.floorIn(s);
    const across = slot * cos;
    const floor = (0.07 * fbm3(across * 0.3 + 2.0, s * 0.3, 5.5) + 0.025 * fbm3(across * 1.2 + 4.0, s * 1.2, 8.8))
      * floorness * floorness;
    const shape = Math.max(1 + faces + floor, 0.72);
    // The trench closes at the start (under the lake) and at the walls' end, far beyond the sonar.
    const cap = smoothstep(0, 3, s) * smoothstep(this.end, this.end - 1.2, s);
    return Math.max(slot * shape * cap, 0.05);
  }

  /**
   * The ring's vertex angles: by height up the faces, densest about the gap (the rock the sonar shows, where the
   * relief must be carried) and sparser toward the void above and below. Each half of the ring is one face, from
   * its foot to its top; the angle runs on with j so the faces join at the top and the floor.
   */
  private ringAngle(j: number) {
    const [a, b] = this.axes(this.length / 2);
    const half = this.config.ringSegments / 2;
    const left = j >= half;
    const t = (left ? 1 - 2 * (j - half) / half : 2 * j / half - 1); // -1 at the foot, 1 at the top
    const height = b * (Math.exp(3 * Math.abs(t)) - 1) / (Math.exp(3) - 1);
    // The face's angle, carried to straight up (or down) at its end so the two faces meet.
    const face = Math.atan2(height, a) + (Math.PI / 2 - Math.atan2(height, a)) * smoothstep(0.85, 1, Math.abs(t));
    const theta = Math.sign(t || 1) * face;
    return left ? Math.PI - theta : theta;
  }

  /**
   * The route frame nearest a point and the point's place in that cross-section. The search runs a window of
   * stations about `hint` (the last answer's index) when given, the whole route otherwise.
   */
  locate(point: Vector3, out: Locus, hint = -1) {
    const {stations} = this;
    const from = hint < 0 ? 0 : Math.max(0, hint - 40);
    const to = hint < 0 ? stations.length - 1 : Math.min(stations.length - 1, hint + 40);
    let best = from;
    let bestDistance = Infinity;
    for (let index = from; index <= to; index++) {
      const distance = stations[index].position.distanceToSquared(point);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    }
    // Refine along the better of the two segments at the nearest station.
    let index = best;
    let t = 0;
    const consider = (a: number, b: number) => {
      if (a < 0 || b >= stations.length) return;
      SEGMENT.subVectors(stations[b].position, stations[a].position);
      const along = SEGMENT.lengthSq();
      if (along < 1e-9) return;
      RELATIVE.subVectors(point, stations[a].position);
      const share = Math.min(1, Math.max(0, RELATIVE.dot(SEGMENT) / along));
      SEGMENT.multiplyScalar(share).add(stations[a].position);
      const distance = SEGMENT.distanceToSquared(point);
      if (distance <= bestDistance) {
        bestDistance = distance;
        index = a;
        t = share;
      }
    };
    consider(best - 1, best);
    consider(best, best + 1);
    const a = stations[index];
    const b = stations[Math.min(index + 1, stations.length - 1)];
    out.index = index;
    out.s = a.s + (b.s - a.s) * t;
    out.center.lerpVectors(a.position, b.position, t);
    out.tangent.lerpVectors(a.tangent, b.tangent, t).normalize();
    out.wide.lerpVectors(a.wide, b.wide, t).normalize();
    out.narrow.lerpVectors(a.narrow, b.narrow, t).normalize();
    OFFSET.subVectors(point, out.center);
    out.u = OFFSET.dot(out.wide);
    out.v = OFFSET.dot(out.narrow);
    out.rho = Math.hypot(out.u, out.v);
    out.radius = this.radius(Math.atan2(out.v, out.u), out.s);
    return out;
  }

  /** Distance from a point along a direction to the wall, up to `max`: a coarse march, then a bisection. */
  wallDistance(point: Vector3, direction: Vector3, max: number, locus: Locus, hint = -1) {
    const step = 0.8;
    let inside = 0;
    let index = hint;
    for (let t = step; t <= max; t += step) {
      MARCH.copy(point).addScaledVector(direction, t);
      this.locate(MARCH, locus, index);
      index = locus.index;
      if (locus.rho > locus.radius) {
        // Bisect the last step.
        let outside = t;
        for (let i = 0; i < 7; i++) {
          const mid = (inside + outside) / 2;
          MARCH.copy(point).addScaledVector(direction, mid);
          this.locate(MARCH, locus, index);
          if (locus.rho > locus.radius) outside = mid;
          else inside = mid;
        }
        return (inside + outside) / 2;
      }
      inside = t;
    }
    return max;
  }

  private bottlePosition(out = new Vector3()) {
    const s = this.length - this.config.basin * 0.45;
    const locus = createLocus();
    const station = this.stations[Math.min(Math.round(s / this.spacing), this.stations.length - 1)];
    this.locate(station.position, locus);
    // The floor is the narrow axis's downward side.
    RADIAL.copy(locus.narrow);
    if (RADIAL.y > 0) RADIAL.negate();
    const theta = Math.atan2(RADIAL.dot(locus.narrow), RADIAL.dot(locus.wide));
    // Resting on the floor: the player has to look down to find it.
    const floor = this.radius(theta, locus.s);
    return out.copy(locus.center).addScaledVector(RADIAL, Math.max(floor - 0.3, 0.4));
  }

  /** Puts the craft on the route a way before the bottle, facing it. */
  placeCraftBeforeBottle(craft: CraftState, distance: number) {
    const locus = createLocus();
    this.locate(this.bottle, locus);
    this.placeCraft(craft, locus.s - distance);
    const toBottle = new Vector3().subVectors(this.bottle, craft.position).normalize();
    craft.yaw = directionYaw(toBottle);
    craft.pitch = directionPitch(toBottle);
  }

  /** Puts the craft on the route at s, heading along it. */
  placeCraft(craft: CraftState, s: number) {
    const station = this.stations[Math.min(Math.max(Math.round(s / this.spacing), 0), this.stations.length - 1)];
    craft.position.copy(station.position);
    craft.yaw = directionYaw(station.tangent);
    craft.pitch = directionPitch(station.tangent);
    craft.yawVelocity = 0;
    craft.pitchVelocity = 0;
    craft.speedScale = 1;
    craft.hint = -1;
  }

  /** The craft's starting place and heading, a little way into the route. */
  startPose() {
    const station = this.stations[Math.min(Math.round(4 / this.spacing), this.stations.length - 1)];
    return {
      position: station.position.clone(),
      yaw: directionYaw(station.tangent),
      pitch: directionPitch(station.tangent),
    };
  }

  /** Triangle mesh of the walls, normals pointing into the crack. */
  buildGeometry() {
    const {stations, config} = this;
    const ring = config.ringSegments;
    const positions = new Float32Array(stations.length * ring * 3);
    const along = new Float32Array(stations.length * ring);
    const vertex = new Vector3();
    for (let i = 0; i < stations.length; i++) {
      const station = stations[i];
      for (let j = 0; j < ring; j++) {
        const theta = this.ringAngle(j);
        const r = this.radius(theta, station.s);
        vertex.copy(station.position)
          .addScaledVector(station.wide, r * Math.cos(theta))
          .addScaledVector(station.narrow, r * Math.sin(theta));
        const k = i * ring + j;
        positions[k * 3] = vertex.x;
        positions[k * 3 + 1] = vertex.y;
        positions[k * 3 + 2] = vertex.z;
        along[k] = station.s / this.length;
      }
    }
    const quads = (stations.length - 1) * ring;
    const indices = new Uint32Array(quads * 6);
    let n = 0;
    for (let i = 0; i < stations.length - 1; i++) {
      for (let j = 0; j < ring; j++) {
        const a = i * ring + j;
        const b = i * ring + (j + 1) % ring;
        const c = (i + 1) * ring + (j + 1) % ring;
        const d = (i + 1) * ring + j;
        // Wound to face the inside of the crack (theta runs wide -> narrow, which is right -> up seen from
        // inside looking down the route).
        indices[n++] = a; indices[n++] = c; indices[n++] = b;
        indices[n++] = a; indices[n++] = d; indices[n++] = c;
      }
    }
    const normals = new Float32Array(positions.length);
    const pa = new Vector3(), pb = new Vector3(), pc = new Vector3(), face = new Vector3();
    for (let i = 0; i < indices.length; i += 3) {
      const ia = indices[i], ib = indices[i + 1], ic = indices[i + 2];
      pa.fromArray(positions, ia * 3);
      pb.fromArray(positions, ib * 3);
      pc.fromArray(positions, ic * 3);
      face.crossVectors(pb.sub(pa), pc.sub(pa));
      for (const index of [ia, ib, ic]) {
        normals[index * 3] += face.x;
        normals[index * 3 + 1] += face.y;
        normals[index * 3 + 2] += face.z;
      }
    }
    for (let i = 0; i < normals.length; i += 3) {
      const l = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
      normals[i] /= l; normals[i + 1] /= l; normals[i + 2] /= l;
    }
    // Make sure the normals point inward (toward the centre line) whichever way the frame turned out.
    const probe = Math.floor(stations.length / 2) * ring;
    const centre = stations[Math.floor(stations.length / 2)].position;
    pa.fromArray(positions, probe * 3);
    pb.fromArray(normals, probe * 3);
    if (pb.dot(pc.subVectors(centre, pa)) < 0) {
      for (let i = 0; i < normals.length; i++) normals[i] = -normals[i];
      for (let i = 0; i < indices.length; i += 3) {
        const swap = indices[i + 1];
        indices[i + 1] = indices[i + 2];
        indices[i + 2] = swap;
      }
    }
    return {positions, normals, indices, along};
  }
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export type CraftState = {
  position: Vector3;
  yaw: number;
  pitch: number;
  yawVelocity: number;
  pitchVelocity: number;
  /** Share of the fixed speed kept, lowered by a bump and recovering. */
  speedScale: number;
  /** The last station found, to keep the route search local. */
  hint: number;
};

export type CraftInput = {
  /** -1..1: left to right. */
  yaw: number;
  /** -1..1: down to up. */
  pitch: number;
};

export function createCraft(route: CrackRoute): CraftState {
  const start = route.startPose();
  return {position: start.position, yaw: start.yaw, pitch: start.pitch, yawVelocity: 0, pitchVelocity: 0,
    speedScale: 1, hint: -1};
}

const HEADING = new Vector3();
const SLIDE = new Vector3();

/**
 * One step of the craft: the heading turns with the input (and with nothing else), the craft moves at its fixed
 * speed (slowed after a bump), stays off the walls and slides along them, its heading easing along the wall
 * rather than snapping. The move is taken in short sub-steps, each checked against the walls, so a fast move
 * cannot slip through a face. Returns whether it bumped.
 */
export function advanceCraft(
  craft: CraftState, input: CraftInput, route: CrackRoute, locus: Locus, delta: number, speed: number,
  config: LakeDiveConfig,
) {
  const dt = Math.min(delta, 1 / 20);
  const settle = 1 - Math.exp(-config.turnDamping * dt);
  // Yaw grows toward the left of the view (the heading turns from +z toward +x), so right input lowers it.
  craft.yawVelocity += (-input.yaw * config.turnRate - craft.yawVelocity) * settle;
  craft.pitchVelocity += (input.pitch * config.pitchRate - craft.pitchVelocity) * settle;
  craft.yaw += craft.yawVelocity * dt;
  craft.pitch = Math.min(config.pitchRange[1], Math.max(config.pitchRange[0], craft.pitch + craft.pitchVelocity * dt));
  // The heading is the player's alone: turning right round is allowed, so a corner is never a trap.
  route.locate(craft.position, locus, craft.hint);
  craft.hint = locus.index;

  craft.speedScale += (1 - craft.speedScale) * (1 - Math.exp(-config.bumpRecover * dt));
  headingDirection(craft.yaw, craft.pitch, HEADING);
  // Slower in the basin, so there is time to search for the bottle; at the end wall the craft holds still rather
  // than pushing at it (it can still turn, look and scan).
  const pace = locus.s > route.length - config.basin - 3 ? config.basinSpeed : 1;
  const atEnd = locus.s > route.length - 3 && HEADING.dot(locus.tangent) > 0;
  const move = atEnd ? 0 : speed * pace * craft.speedScale * dt;
  // The move in sub-steps, each kept off the walls, so none can carry the craft through a face.
  const steps = Math.max(1, Math.ceil(move / config.collisionStep));
  let bumped = false;
  for (let step = 0; step < steps; step++) {
    craft.position.addScaledVector(HEADING, move / steps);
    if (settleAgainstWalls(craft, route, locus, config, dt / steps)) bumped = true;
  }
  if (move === 0 && settleAgainstWalls(craft, route, locus, config, dt)) bumped = true;
  return bumped;
}

/**
 * Keeps the craft off the walls and off the route's closed ends; true on contact. Pressed against a wall, the
 * heading eases toward the wall's own direction (the slide) rather than snapping to it.
 */
function settleAgainstWalls(
  craft: CraftState, route: CrackRoute, locus: Locus, config: LakeDiveConfig, dt: number,
) {
  route.locate(craft.position, locus, craft.hint);
  craft.hint = locus.index;
  const endMargin = 2.5;
  if (locus.s > route.length - endMargin || locus.s < endMargin) {
    const over = locus.s > route.length - endMargin ? locus.s - (route.length - endMargin) : locus.s - endMargin;
    craft.position.addScaledVector(locus.tangent, -over);
    route.locate(craft.position, locus, craft.hint);
    craft.speedScale = Math.min(craft.speedScale, config.bumpSlow);
  }
  const limit = Math.max(locus.radius - config.margin, 0.2);
  if (locus.rho <= limit) return false;
  RADIAL.copy(locus.wide).multiplyScalar(locus.u / locus.rho).addScaledVector(locus.narrow, locus.v / locus.rho);
  craft.position.copy(locus.center).addScaledVector(RADIAL, limit);
  craft.speedScale = Math.min(craft.speedScale, config.bumpSlow);
  const into = HEADING.dot(RADIAL);
  if (into > 0) {
    SLIDE.copy(HEADING).addScaledVector(RADIAL, -into);
    if (SLIDE.lengthSq() > 1e-6) {
      SLIDE.normalize();
      const ease = 1 - Math.exp(-config.slideEase * dt);
      craft.yaw += wrapAngle(directionYaw(SLIDE) - craft.yaw) * ease;
      const pitch = craft.pitch + (directionPitch(SLIDE) - craft.pitch) * ease;
      craft.pitch = Math.min(config.pitchRange[1], Math.max(config.pitchRange[0], pitch));
      headingDirection(craft.yaw, craft.pitch, HEADING);
    }
  }
  return true;
}
