// Scene distance fog, blended toward the denser flight fog during Art camera journeys, and thinned away during the
// Travel zoom-out as the camera leaves the haze (the fog distances grow with altitude). On phones About's camera
// stands further back to see the whole route, so the fog moves out with it while About is open.
'use client';

import {useRef} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import {MathUtils, type Fog} from 'three';
import {FOG_CONFIG, SCENE_LAYOUT_CONFIG} from '@/config/scene';
import {ABOUT_MAP_CONFIG} from '@/config/scene/aboutPath';
import {TRAVEL_CONFIG} from '@/config/scene/travel';
import type {FogControlValues} from '@/components/scene/controls/useSceneControls';
import {artTransitionSettings} from '@/lib/art/transitionSettings';
import {useCameraFrameState} from '../camera/CameraFrameState';

/** Distance fog, thickened by Art camera journeys (see CameraFrameState.artFog), thinned by the Travel morph. */
export function SceneFog({settings, about = false}: {settings: FogControlValues; about?: boolean}) {
  const fog = useRef<Fog>(null);
  const cameraFrameState = useCameraFrameState();
  const isMobile = useThree((state) => state.size.width) < SCENE_LAYOUT_CONFIG.mobileMaxWidth;
  const aboutScale = useRef(1);

  // After the camera rig (-0.75), before the terrain cache (0.5).
  useFrame((_, delta) => {
    if (!fog.current) return;
    // Eased like the camera's journey to and from About, so the haze never jumps.
    const aboutTarget = isMobile && about ? ABOUT_MAP_CONFIG.phoneFogScale : 1;
    aboutScale.current += (aboutTarget - aboutScale.current) * (1 - Math.exp(-3 * Math.min(delta, 1 / 30)));
    const {artFog, travelMorph} = cameraFrameState.current;
    const [hazeFrom, hazeTo] = TRAVEL_CONFIG.hazeOut;
    const altitude = aboutScale.current
      * Math.exp(Math.log(TRAVEL_CONFIG.hazeFactor) * MathUtils.smoothstep(travelMorph, hazeFrom, hazeTo));
    fog.current.near = MathUtils.lerp(settings.near, artTransitionSettings.flightFogNear, artFog) * altitude;
    fog.current.far = MathUtils.lerp(settings.far, artTransitionSettings.flightFogFar, artFog) * altitude;
  }, -0.7);

  return <fog ref={fog} attach="fog" args={[FOG_CONFIG.color, settings.near, settings.far]} />;
}
