'use client';

import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {MathUtils, type Fog} from 'three';
import {FOG_CONFIG} from '@/config/scene';
import type {FogControlValues} from '@/components/debug/useSceneControls';
import {artTransitionSettings} from '@/lib/scene/artTransitionSettings';
import {useCameraFrameState} from './CameraFrameState';

/** Distance fog, thickened by Art camera journeys (see CameraFrameState.artFog). */
export function SceneFog({settings}: {settings: FogControlValues}) {
  const fog = useRef<Fog>(null);
  const cameraFrameState = useCameraFrameState();

  // After the camera rig (-0.75), before the terrain cache (0.5).
  useFrame(() => {
    if (!fog.current) return;
    const weight = cameraFrameState.current.artFog;
    fog.current.near = MathUtils.lerp(settings.near, artTransitionSettings.flightFogNear, weight);
    fog.current.far = MathUtils.lerp(settings.far, artTransitionSettings.flightFogFar, weight);
  }, -0.7);

  return <fog ref={fog} attach="fog" args={[FOG_CONFIG.color, settings.near, settings.far]} />;
}
