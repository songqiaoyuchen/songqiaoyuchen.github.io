// Live Art journey settings (camera, wipe, flight fog), read every frame; Leva "Art Transition" retunes them.
import {CAMERA_JOURNEY_CONFIG} from '@/config/scene/camera';
import {BACKDROP_CONFIG} from '@/config/art/backdrop';
import {FOG_CONFIG} from '@/config/scene/fog';

/** Live Art transition settings, read every frame. Development controls retune them. */
export const artTransitionSettings = {
  cameraSeconds: CAMERA_JOURNEY_CONFIG.art as number,
  revealSeconds: BACKDROP_CONFIG.revealSeconds as number,
  fogReleaseSeconds: BACKDROP_CONFIG.fogReleaseSeconds as number,
  flightFogNear: FOG_CONFIG.flightNear as number,
  flightFogFar: FOG_CONFIG.flightFar as number,
};
