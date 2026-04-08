'use client';

import { Canvas } from '@react-three/fiber';
import { SceneLights } from './scene/SceneLights';
import { HomeGlobe } from './scene/globe/HomeGlobe';
import { HomeGlobeTransition } from './scene/globe/HomeGlobeTransition';
import { HomeCameraRig } from './scene/HomeCameraRig';
import { HomeGlobeController } from './scene/globe/HomeGlobeController';
import { TRANSITION_CONFIG } from './scene/config';
import { HOME_LOCATIONS } from './scene/locations/homeLocations';
import { useRef } from 'react';
import { Mesh } from 'three';

interface HomeSceneProps {
  activeLocationIndex: number;
  isTransitioning: boolean;
}

export function HomeScene({ activeLocationIndex, isTransitioning }: HomeSceneProps) {
  const targetProgress = useRef(0);
  const progress = useRef(0);
  const globeRef = useRef<Mesh>(null);
  const activeLocation = HOME_LOCATIONS[activeLocationIndex] ?? HOME_LOCATIONS[0];

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY;
    targetProgress.current = Math.max(
      0,
      Math.min(1, targetProgress.current + (delta * TRANSITION_CONFIG.wheelSensitivity))
    );
  };

  return (
    <div
      className="absolute inset-0 z-0"
      data-phase-b-location={activeLocation.id}
      data-phase-b-transitioning={isTransitioning ? 'true' : 'false'}
      onWheel={handleWheel}
    >
      <Canvas gl={{ alpha: true }}>

        <HomeGlobe ref={globeRef} />

        <SceneLights />

        <HomeGlobeTransition
          progress={progress} 
          targetProgress={targetProgress} 
          globeRef={globeRef} 
        />

        <HomeCameraRig
          progress={progress}
          globeRef={globeRef}
        />
        
        <HomeGlobeController 
          progress={progress} 
          globeRef={globeRef} 
        />
      </Canvas>
    </div>
  );
}
