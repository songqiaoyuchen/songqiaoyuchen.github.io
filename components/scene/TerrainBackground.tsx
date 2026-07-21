'use client';

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, SelectiveBloom } from '@react-three/postprocessing';
import { SMAAPreset } from 'postprocessing';
import { Leva, useControls } from 'leva';
import type { AmbientLight, Fog, Mesh, ShaderMaterial } from 'three';
import type { OrbitControls as OrbitControlsInstance } from 'three-stdlib';
import { TERRAIN_CONFIG } from '@/config/terrain';
import { ColorOnlySMAA } from '@/components/effects/ColorOnlySMAA';
import { useDescentControls } from '@/components/debug/useDescentControls';
import { usePostControls } from '@/components/debug/usePostControls';
import {
  ScrollSceneController,
  type ScrollExperienceRefs,
} from './ScrollSceneController';
import { TerrainMesh } from './TerrainMesh';
import { ContourLines } from './ContourLines';
import { DecorativeStreams } from './DecorativeStreams';
import { LinkStreams } from './LinkStreams';

function CanvasActivity({ paused }: { paused: boolean }) {
  const invalidate = useThree((state) => state.invalidate);

  // A demand-driven canvas keeps its GPU work stopped after the wash, while
  // still accepting an explicit wake-up when reverse scrolling reveals it.
  // Keeping the scene mounted also avoids rebuilding the expensive contours.
  useEffect(() => {
    if (!paused) invalidate();
  }, [invalidate, paused]);

  return null;
}

type Props = {
  paused?: boolean;
  washRef: RefObject<HTMLDivElement | null>;
  onWashedChange: (washed: boolean) => void;
  domRefs: ScrollExperienceRefs;
};

export function TerrainBackground({
  paused = false,
  washRef,
  onWashedChange,
  domRefs,
}: Props) {
  const orbitcontrolsRef = useRef<OrbitControlsInstance>(null);
  const [bloomLight, setBloomLight] = useState<AmbientLight | null>(null);
  const [sceneFog, setSceneFog] = useState<Fog | null>(null);
  const [contourMesh, setContourMesh] = useState<Mesh | null>(null);
  const [decorativeStreamsMesh, setDecorativeStreamsMesh] = useState<Mesh | null>(null);
  const [linkStreamsMesh, setLinkStreamsMesh] = useState<Mesh | null>(null);
  const [decorativeMaterial, setDecorativeMaterial] = useState<ShaderMaterial | null>(null);
  const [linkMaterial, setLinkMaterial] = useState<ShaderMaterial | null>(null);
  const post = usePostControls();
  const descent = useDescentControls();
  const fog = useControls('Fog', {
    near: {
      value: TERRAIN_CONFIG.fog.near,
      min: 0,
      max: 20,
      step: 0.5,
      label: 'Near',
    },
    far: {
      value: TERRAIN_CONFIG.fog.far,
      min: 2,
      max: 50,
      step: 0.5,
      label: 'Far',
    },
  });

  return (
    <>
      <Leva
        hidden
      />
      <div
        className="terrain-canvas-host fixed inset-0"
        style={{ zIndex: 0, visibility: paused ? 'hidden' : 'visible' }}
      >
        <Canvas
          camera={{ position: TERRAIN_CONFIG.camera.position, fov: TERRAIN_CONFIG.camera.fov }}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          frameloop={paused ? 'demand' : 'always'}
        >
          <CanvasActivity paused={paused} />
          <color attach="background" args={[TERRAIN_CONFIG.fog.color]} />
          {/* SelectiveBloom expects a light for its isolated render. */}
          <ambientLight ref={setBloomLight} intensity={0} />
          <fog
            ref={setSceneFog}
            attach="fog"
            args={[TERRAIN_CONFIG.fog.color, fog.near, fog.far]}
          />
          {descent.freeCamera ? (
            <OrbitControls ref={orbitcontrolsRef} target={TERRAIN_CONFIG.camera.target} makeDefault />
          ) : null}
          <ScrollSceneController
            washRef={washRef}
            onWashedChange={onWashedChange}
            cameraEnabled={!descent.freeCamera}
            endX={descent.descentEndX}
            endY={descent.descentEndY}
            endZ={descent.descentEndZ}
            endFov={descent.descentEndFov}
            endHeading={descent.descentEndHeading}
            bow={descent.descentBow}
            scrubSeconds={descent.scrollScrubSeconds}
            fog={sceneFog}
            fogNearStart={fog.near}
            fogFarStart={fog.far}
            fogNearEnd={descent.fogNearEnd}
            fogFarEnd={descent.fogFarEnd}
            streamFadeStart={descent.streamFadeStart}
            streamFadeEnd={descent.streamFadeEnd}
            decorativeMaterial={decorativeMaterial}
            linkMaterial={linkMaterial}
            domRefs={domRefs}
          />
          <Suspense fallback={null}>
            <TerrainMesh />
            <ContourLines ref={setContourMesh} />
            <DecorativeStreams
              ref={setDecorativeStreamsMesh}
              onMaterialReady={setDecorativeMaterial}
            />
            <LinkStreams
              ref={setLinkStreamsMesh}
              onMaterialReady={setLinkMaterial}
            />
          </Suspense>
          {/* Keep the composer single-sampled: MSAA resolve blits intermittently
              present empty frames on some GPUs. Color-only SMAA smooths edges
              without requesting the composer's sampled depth texture. */}
          {contourMesh && decorativeStreamsMesh && linkStreamsMesh && bloomLight ? (
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
    </>
  );
}
