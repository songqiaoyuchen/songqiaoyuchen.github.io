'use client';

import { Canvas } from '@react-three/fiber';
import { SceneControls } from './scene/SceneControls';
import { SceneLights } from './scene/SceneLights';
import { Globe } from './scene/Globe';
import { SCENE_CONFIG } from './scene/config';

export function HomeScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas 
        camera={{ 
          position: [...SCENE_CONFIG.camera.position], 
          fov: SCENE_CONFIG.camera.fov 
        }}
      >
        <SceneLights />
        <Globe />
        <SceneControls />
      </Canvas>
    </div>
  );
}
