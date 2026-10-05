import {CAMERA_CONFIG} from '@/config/scene/camera';
import {ART_ILLUSTRATION_CONFIG} from '@/config/scene/artIllustration';
import {FOG_CONFIG} from '@/config/scene/fog';

/** Live Art transition settings, read every frame. Development controls retune them. */
export const artTransitionSettings = {
  cameraSeconds: CAMERA_CONFIG.artTransitionSeconds as number,
  revealSeconds: ART_ILLUSTRATION_CONFIG.revealSeconds as number,
  fogReleaseSeconds: ART_ILLUSTRATION_CONFIG.fogReleaseSeconds as number,
  flightFogNear: FOG_CONFIG.flightNear as number,
  flightFogFar: FOG_CONFIG.flightFar as number,
};
