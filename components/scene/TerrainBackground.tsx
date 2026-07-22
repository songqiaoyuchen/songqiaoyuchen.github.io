'use client';

import { Suspense, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, SelectiveBloom } from '@react-three/postprocessing';
import { SMAAPreset } from 'postprocessing';
import type { AmbientLight, Mesh } from 'three';
import type { OrbitControls as OrbitControlsInstance } from 'three-stdlib';
import {CAMERA_CONFIG, FOG_CONFIG} from '@/config/scene';
import { SaveCameraButton } from '@/components/debug/SaveCameraButton';
import { ColorOnlySMAA } from '@/components/effects/ColorOnlySMAA';
import { SaveConfigButton } from '@/components/debug/SaveConfigButton';
import { usePostControls } from '@/components/debug/usePostControls';
import { SceneFog } from './SceneFog';
import { TerrainMesh } from './TerrainMesh';
import { ContourLines } from './ContourLines';
import { DecorStreams } from './DecorStreams';
import {LinkStreams} from './LinkStreams';
import { CameraRig } from './CameraRig';
import type {SectionId} from '@/data/sections';

type TerrainBackgroundProps = {
  activeId: SectionId | null;
  onStreamClick: (id: SectionId) => void;
};

export function TerrainBackground({activeId, onStreamClick}: TerrainBackgroundProps) {
  const orbitcontrolsRef = useRef<OrbitControlsInstance>(null);
  const [bloomLight, setBloomLight] = useState<AmbientLight | null>(null);
  const [contourMesh, setContourMesh] = useState<Mesh | null>(null);
  const [decorStreamsMesh, setDecorStreamsMesh] = useState<Mesh | null>(null);
  const [linkStreamsMesh, setLinkStreamsMesh] = useState<Mesh | null>(null);
  const post = usePostControls();

  return (
    <div className="absolute inset-0 z-0">
      <SaveConfigButton />
      <Canvas
        camera={{position: CAMERA_CONFIG.position, fov: CAMERA_CONFIG.fov}}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={[FOG_CONFIG.color]} />
        {/* SelectiveBloom expects a light for its isolated render. */}
        <ambientLight ref={setBloomLight} intensity={0} />
        <OrbitControls ref={orbitcontrolsRef} target={CAMERA_CONFIG.target} makeDefault />
        <CameraRig controlsRef={orbitcontrolsRef} isFocused={activeId !== null} />
        <SaveCameraButton controlsRef={orbitcontrolsRef} />
        <SceneFog />
        <Suspense fallback={null}>
          <TerrainMesh />
          <ContourLines ref={setContourMesh} />
          <DecorStreams ref={setDecorStreamsMesh} />
          <LinkStreams
            ref={setLinkStreamsMesh}
            activeId={activeId}
            onStreamClick={onStreamClick}
          />
        </Suspense>
        {/* Keep the composer single-sampled: MSAA resolve blits intermittently
            present empty frames on some GPUs. Color-only SMAA smooths edges
            without requesting the composer's sampled depth texture. */}
        {contourMesh && decorStreamsMesh && linkStreamsMesh && bloomLight ? (
          <EffectComposer multisampling={0}>
            <ColorOnlySMAA preset={SMAAPreset.MEDIUM} />
            <SelectiveBloom
              lights={[bloomLight]}
              selection={[contourMesh, linkStreamsMesh]}
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
