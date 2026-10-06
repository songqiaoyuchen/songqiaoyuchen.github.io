// Homepage field of view that keeps the authored framing across desktop aspect ratios.
import {MathUtils} from 'three';

type CameraFraming = {
  referenceViewport: {width: number; height: number};
  mobileMaxWidth: number;
  minCoverFov: number;
};

export function getHomeFov(
  width: number,
  height: number,
  baseFov: number,
  framing: CameraFraming,
) {
  if (width < framing.mobileMaxWidth) return baseFov;

  const referenceAspect = framing.referenceViewport.width / framing.referenceViewport.height;
  const viewportAspect = width / Math.max(height, 1);
  const referenceHalfFov = MathUtils.degToRad(baseFov * 0.5);
  const horizontalFov = MathUtils.radToDeg(
    2 * Math.atan(Math.tan(referenceHalfFov) * referenceAspect / viewportAspect),
  );
  return MathUtils.clamp(horizontalFov, framing.minCoverFov, baseFov);
}
