// Scene distance fog, blended toward the denser flight fog during Art camera journeys, and thinned away during the
// Travel zoom-out as the camera leaves the haze (the fog distances grow with altitude).
'use client';

import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {MathUtils, type Fog} from 'three';
import {FOG_CONFIG} from '@/config/scene';
import {TRAVEL_CONFIG} from '@/config/scene/travel';
import type {FogControlValues} from '@/components/scene/controls/useSceneControls';
import {artTransitionSettings} from '@/lib/art/transitionSettings';
import {useCameraFrameState} from '../camera/CameraFrameState';

/** Distance fog, thickened by Art camera journeys (see CameraFrameState.artFog), thinned by the Travel morph. */
export function SceneFog({settings}: {settings: FogControlValues}) {
  const fog = useRef<Fog>(null);
  const cameraFrameState = useCameraFrameState();

  // After the camera rig (-0.75), before the terrain cache (0.5).
  useFrame(() => {
    if (!fog.current) return;
    const {artFog, travelMorph} = cameraFrameState.current;
    const [hazeFrom, hazeTo] = TRAVEL_CONFIG.hazeOut;
    const altitude = Math.exp(Math.log(TRAVEL_CONFIG.hazeFactor) * MathUtils.smoothstep(travelMorph, hazeFrom, hazeTo));
    fog.current.near = MathUtils.lerp(settings.near, artTransitionSettings.flightFogNear, artFog) * altitude;
    fog.current.far = MathUtils.lerp(settings.far, artTransitionSettings.flightFogFar, artFog) * altitude;
  }, -0.7);

  return <fog ref={fog} attach="fog" args={[FOG_CONFIG.color, settings.near, settings.far]} />;
}
