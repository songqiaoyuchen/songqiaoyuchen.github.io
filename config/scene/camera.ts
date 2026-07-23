import type {Vector3Tuple} from 'three';

export const CAMERA_CONFIG = {
  overviewPosition: [7.051, 13.416, -9.158] as Vector3Tuple,
  overviewTarget: [3.368, 10.763, 3.04] as Vector3Tuple,
  focusedPosition: [3.397, 13.444, -6.564] as Vector3Tuple,
  focusedTarget: [1.071, 10.028, 3.214] as Vector3Tuple,
  fov: 38,
  damping: 4.6,
} as const;
