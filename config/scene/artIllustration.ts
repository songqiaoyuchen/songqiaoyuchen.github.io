import type {Vector3Tuple} from 'three';

// Fixed camera used to author both paintings. Changing the Art pose requires
// new images; viewport changes crop this projection without stretching it.
export const ART_ILLUSTRATION_CONFIG = {
  aspect: 2,
  fov: 38,
  position: [-0.922, 10.343, 7.177] as Vector3Tuple,
  lookAt: [6.542, 8.98, 5.106] as Vector3Tuple,
  projectionDistance: 10,
  revealSeconds: 3,
  dissolveSeconds: 0.3,
  // Flight fog fades after the arrival wipe; only Digital shows the difference.
  fogReleaseSeconds: 2,
  // The scene follows a selection only after browsing pauses this long.
  settleSeconds: 0.35,
} as const;
