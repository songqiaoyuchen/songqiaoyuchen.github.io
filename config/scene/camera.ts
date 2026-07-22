import type {Vector3Tuple} from 'three';

export const CAMERA_CONFIG = {
  overviewPosition: [4.703, 13.723, -9.43] as Vector3Tuple,
  overviewTarget: [3.962, 11.242, 3.325] as Vector3Tuple,
  focusedPosition: [3.397, 13.444, -6.564] as Vector3Tuple,
  focusedTarget: [1.071, 10.028, 3.214] as Vector3Tuple,
  fov: 41.158,
  damping: 4.6,
} as const;
