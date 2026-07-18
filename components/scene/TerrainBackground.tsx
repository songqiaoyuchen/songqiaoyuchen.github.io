'use client';

import { Suspense, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, SelectiveBloom } from '@react-three/postprocessing';
import { SMAAPreset } from 'postprocessing';
import type { AmbientLight, Mesh } from 'three';
import type { OrbitControls as OrbitControlsInstance } from 'three-stdlib';
import { TERRAIN_CONFIG } from '@/config/terrain';
import { CameraLogger } from '@/components/debug/CameraLogger';
import { ColorOnlySMAA } from '@/components/effects/ColorOnlySMAA';
import { SaveConfigButton } from '@/components/debug/SaveConfigButton';
import { usePostControls } from '@/components/debug/usePostControls';
import { SceneFog } from './SceneFog';
import { TerrainMesh } from './TerrainMesh';
import { ContourLines } from './ContourLines';

export function TerrainBackground() {
  const orbitcontrolsRef = useRef<OrbitControlsInstance>(null);
  const [bloomLight, setBloomLight] = useState<AmbientLight | null>(null);
  const [contourMesh, setContourMesh] = useState<Mesh | null>(null);
  const post = usePostControls();

  return (
    <div className="absolute bottom-0 left-0 w-full h-full" style={{ zIndex: 0 }}>
      <SaveConfigButton />
      <Canvas
        camera={{ position: TERRAIN_CONFIG.camera.position, fov: TERRAIN_CONFIG.camera.fov }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        {/* Opaque canvas matching the page --background: the EffectComposer
            doesn't have to deal with alpha, and bloom composites correctly. */}
        <color attach="background" args={[TERRAIN_CONFIG.fog.color]} />
        {/* SelectiveBloom expects a light for its isolated render. The contour
            shader is emissive and ignores it; keeping this at zero preserves
            the scene while satisfying that pass. */}
        <ambientLight ref={setBloomLight} intensity={0} />
        <OrbitControls ref={orbitcontrolsRef} target={TERRAIN_CONFIG.camera.target} makeDefault />
        <CameraLogger controlsRef={orbitcontrolsRef} />
        <SceneFog />
        <Suspense fallback={null}>
          <TerrainMesh />
          <ContourLines ref={setContourMesh} />
        </Suspense>
        {/* Keep the composer single-sampled: MSAA resolve blits intermittently
            present empty frames on some GPUs. Color-only SMAA smooths edges
            without requesting the composer's sampled depth texture. */}
        {contourMesh && bloomLight ? (
          <EffectComposer multisampling={0}>
            <ColorOnlySMAA preset={SMAAPreset.MEDIUM} />
            <SelectiveBloom
              lights={[bloomLight]}
              selection={[contourMesh]}
              mipmapBlur
              intensity={post.bloomIntensity}
              luminanceThreshold={post.bloomThreshold}
              luminanceSmoothing={post.bloomSmoothing}
            />
          </EffectComposer>
        ) : null}
      </Canvas>
    </div>
  );
}
