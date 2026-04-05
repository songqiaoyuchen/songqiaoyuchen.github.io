'use client';

import { Canvas } from '@react-three/fiber';
import { SceneLights } from './scene/SceneLights';
import { Globe } from './scene/Globe';
import { SceneController } from './scene/SceneController';
import { GlobeDragController } from './scene/GlobeDragController';
import { SceneMode, SCENE_CONFIG } from './scene/config';
import { useState, useRef } from 'react';
import { Mesh } from 'three';

export function HomeScene() {
  const [mode, setMode] = useState<SceneMode>('A');
  const globeRef = useRef<Mesh>(null);

  // Temporary function to toggle modes
  const handleToggleMode = () => {
    setMode((prev) => (prev === 'A' ? 'B' : 'A'));
  };

  return (
    <div className="absolute inset-0 z-0">
      {/* 
        Temporary Debug UI 
        Removing standard HTML overlays could be handled better later
      */}
      <button 
        className="absolute top-4 left-4 z-10 text-white bg-black/50 px-4 py-2 rounded-md cursor-pointer select-none"
        onClick={handleToggleMode}
      >
        Current Mode: {mode}. Click to switch.
      </button>

      <Canvas>
        <SceneController mode={mode} />
        
        <SceneLights />
        
        <Globe 
          ref={globeRef} 
          mode={mode} 
        />
        
        {mode === 'B' && (
          <GlobeDragController 
            globeRef={globeRef} 
            rotateSpeed={SCENE_CONFIG.modes.B.controls.rotateSpeed}
          />
        )}
      </Canvas>
    </div>
  );
}
