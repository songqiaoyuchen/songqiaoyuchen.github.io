'use client';

import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsInstance } from 'three-stdlib';
import { TERRAIN_CONFIG } from '@/config/terrain';
import { CameraLogger } from '@/components/debug/CameraLogger';
import { SceneFog } from './SceneFog';
import { TerrainMesh } from './TerrainMesh';

export function TerrainBackground() {
  const orbitcontrolsRef = useRef<OrbitControlsInstance>(null);

  return (
    <div className="absolute bottom-0 left-0 w-full h-full" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: TERRAIN_CONFIG.camera.position, fov: TERRAIN_CONFIG.camera.fov }}
        gl={{ alpha: true, antialias: false }}
        style={{ background: 'transparent' }}
      >
        <OrbitControls ref={orbitcontrolsRef} target={TERRAIN_CONFIG.camera.target} makeDefault />
        <CameraLogger controlsRef={orbitcontrolsRef} />
        <SceneFog />
        <Suspense fallback={null}>
          <TerrainMesh />
        </Suspense>
      </Canvas>
    </div>
  );
}
