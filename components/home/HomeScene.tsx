'use client';

import { Canvas } from '@react-three/fiber';
import { SceneLights } from './scene/SceneLights';
import { Globe } from './scene/Globe';
import { SceneController } from './scene/SceneController';
import { SceneInteractionController } from './scene/SceneInteractionController';
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
        <SceneController 
          progress={progress} 
          targetProgress={targetProgress} 
          globeRef={globeRef} 
        />
        <SceneInteractionController 
          progress={progress} 
          globeRef={globeRef} 
        />
    
        <SceneLights />
        
        <Globe ref={globeRef} />
      </Canvas>
    </div>
  );
}
