// Leva "Mobile Scene Links" folder (dev only); Save Config writes every key below to config/scene/sceneLinks.ts.
// Values are normalized device coordinates (-1/1 = viewport edges) unless noted.
import {useControls} from 'leva';
import {MOBILE_SCENE_LINK_CONFIG} from '@/config/scene';

export function useSceneLinkControls() {
  return useControls('Mobile Scene Links', {
    // SceneLinks.tsx (mobile): screen X of the first link.
    mobileStartX: {
      value: MOBILE_SCENE_LINK_CONFIG.mobileStartX,
      min: -1,
      max: 0,
      step: 0.01,
      label: 'Start X',
    },
    // SceneLinks.tsx (mobile): screen X of the last link.
    mobileEndX: {
      value: MOBILE_SCENE_LINK_CONFIG.mobileEndX,
      min: 0,
      max: 1,
      step: 0.01,
      label: 'End X',
    },
    // SceneLinks.tsx (mobile): screen Y the row of links is projected from.
    mobileCenterY: {
      value: MOBILE_SCENE_LINK_CONFIG.mobileCenterY,
      min: -2,
      max: 0.5,
      step: 0.005,
      label: 'Center Y (NDC)',
    },
    // SceneLinks.tsx (mobile): pushes links further from the camera, in world units.
    mobileDepthOffset: {
      value: MOBILE_SCENE_LINK_CONFIG.mobileDepthOffset,
      min: 0,
      max: 12,
      step: 0.1,
      label: 'Depth Offset',
    },
  });
}
