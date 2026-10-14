// The homepage intro's descent: the map pose straight above the summit the camera opens at, and how the ground's
// light and the fog follow the camera down (CameraRig drives the descent, 0 at the map to 1 at the overview).
// No three.js or config imports, so the node tests can load it.

type Pose = Readonly<{position: readonly [number, number, number]; lookAt: readonly [number, number, number]}>;

/**
 * The map pose: `height` above the summit, looking down at it, leaning back by `tiltDegrees` along the overview's
 * heading on the plane. The lean keeps screen-up at the overview's far side, so the descent is one pitch down
 * and never a roll.
 */
export function mapPose(overview: Pose, summit: readonly [number, number, number], height: number,
  tiltDegrees: number): {position: [number, number, number]; lookAt: [number, number, number]} {
  const [px, , pz] = overview.position;
  const [lx, , lz] = overview.lookAt;
  const length = Math.hypot(lx - px, lz - pz) || 1;
  const back = height * Math.tan(tiltDegrees * Math.PI / 180);
  const [sx, sy, sz] = summit;
  return {
    position: [sx - (lx - px) / length * back, sy + height, sz - (lz - pz) / length * back],
    lookAt: [sx, sy, sz],
  };
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / Math.max(edge1 - edge0, 1e-6)));
  return t * t * (3 - 2 * t);
}

/** The ground's light, 0 to 1, at this point of the descent: off at the map, on over `span`. */
export function introLights(descent: number, span: readonly [number, number]) {
  return smoothstep(span[0], span[1], descent);
}

/** The fog distances' multiple at this point of the descent: `mapScale` at the map, 1 at the overview. */
export function introFogScale(descent: number, mapScale: number) {
  return Math.exp(Math.log(Math.max(mapScale, 1e-6)) * (1 - Math.min(1, Math.max(0, descent))));
}
