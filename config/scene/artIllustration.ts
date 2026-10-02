import type {Vector3Tuple} from 'three';

// Fixed camera used to author both paintings. Changing the Art pose requires
// new images; viewport changes crop this projection without stretching it.
export const ART_ILLUSTRATION_CONFIG = {
  aspect: 2,
  fov: 38,
  position: [5.822, 9.894, -6.385] as Vector3Tuple,
  lookAt: [-3.397, 7.305, -2.975] as Vector3Tuple,
  projectionDistance: 10,
  revealSeconds: 1.5,
  dissolveSeconds: 0.3,
} as const;
