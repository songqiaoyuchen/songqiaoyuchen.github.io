'use client';

import { Canvas } from '@react-three/fiber';
import { SceneLights } from './scene/SceneLights';
import { HomeGlobe } from './scene/globe/HomeGlobe';
import { HomeGlobeTransition } from './scene/globe/HomeGlobeTransition';
import { HomeCameraRig } from './scene/HomeCameraRig';
import { HomeGlobeController } from './scene/globe/HomeGlobeController';
import { TRANSITION_CONFIG } from './scene/config';
import { useRef } from 'react';
import { Mesh } from 'three';

export function HomeScene() {
  const targetProgress = useRef(0);
  const progress = useRef(0);
  const globeRef = useRef<Mesh>(null);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY;
    targetProgress.current = Math.max(
      0,
      Math.min(1, targetProgress.current + (delta * TRANSITION_CONFIG.wheelSensitivity))
    );
  };

  return (
    <div className="absolute inset-0 z-0" onWheel={handleWheel}>
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
