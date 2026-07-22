import {MathUtils} from 'three';
import {CAMERA_CONFIG} from '@/config/scene';

export const OVERVIEW_CAMERA = {
  position: CAMERA_CONFIG.position,
  target: CAMERA_CONFIG.target,
} as const;

export const FOCUSED_CAMERA = {
  position: [3.397, 13.444, -6.564] as const,
  target: [1.071, 10.028, 3.214] as const,
} as const;

const DESKTOP_REFERENCE = {
  width: 1440,
  height: 900,
} as const;
const MOBILE_MAX_WIDTH = 768;
const MIN_COVER_FOV = 38;

export function getHomeFov(width: number, height: number) {
  if (width < MOBILE_MAX_WIDTH) return CAMERA_CONFIG.fov;

  const referenceAspect = DESKTOP_REFERENCE.width / DESKTOP_REFERENCE.height;
  const viewportAspect = width / Math.max(height, 1);
  const referenceHalfFov = MathUtils.degToRad(CAMERA_CONFIG.fov * 0.5);
  const horizontalFov = MathUtils.radToDeg(
    2 * Math.atan(Math.tan(referenceHalfFov) * referenceAspect / viewportAspect),
  );
  return MathUtils.clamp(horizontalFov, MIN_COVER_FOV, CAMERA_CONFIG.fov);
}
