'use client';

import {Suspense, useEffect, useMemo, useRef, useState} from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, StatsGl } from '@react-three/drei';
import { EffectComposer } from '@react-three/postprocessing';
import { SMAAPreset } from 'postprocessing';
import type {DepthTexture, Mesh} from 'three';
import type { OrbitControls as OrbitControlsInstance } from 'three-stdlib';
import {CAMERA_CONFIG, FOG_CONFIG} from '@/config/scene';
import { SaveCameraButton } from '@/components/debug/SaveCameraButton';
import { ColorOnlySMAA } from '@/components/effects/ColorOnlySMAA';
import {IsolatedBloom} from '@/components/effects/IsolatedBloom';
import { SaveConfigButton } from '@/components/debug/SaveConfigButton';
import {useSceneControls} from '@/components/debug/useSceneControls';
import { SceneFog } from './SceneFog';
import {CachedTerrain} from './CachedTerrain';
import { ContourLines } from './ContourLines';
import { DecorStreams } from './DecorStreams';
import {LinkStreams} from './LinkStreams';
import {SceneHeroName} from './SceneHeroName';
import { CameraRig } from './CameraRig';
import {SceneErrorBoundary} from './SceneErrorBoundary';
import {SceneReadySignal} from './SceneReadySignal';
import {CameraFrameProvider} from './CameraFrameState';
import type {SectionId} from '@/config/navigation/linkStreams';

type TerrainBackgroundProps = {
  activeId: SectionId | null;
  introStarted: boolean;
  onSceneError: (error: Error) => void;
  onSceneProgress: (progress: number) => void;
  onSceneReady: () => void;
  onStreamClick: (id: SectionId) => void;
};

export function TerrainBackground({
  activeId,
  introStarted,
  onSceneError,
  onSceneProgress,
  onSceneReady,
  onStreamClick,
}: TerrainBackgroundProps) {
  const orbitcontrolsRef = useRef<OrbitControlsInstance>(null);
  const [contourMesh, setContourMesh] = useState<Mesh | null>(null);
  const [linkStreamsMesh, setLinkStreamsMesh] = useState<Mesh | null>(null);
  const [terrainDepthTexture, setTerrainDepthTexture] = useState<DepthTexture | null>(null);
  const isDevelopment = process.env.NODE_ENV === 'development';
  const settings = useSceneControls();
  const bloomSelection = useMemo(
    () => [contourMesh, linkStreamsMesh]
      .filter((mesh): mesh is Mesh => mesh !== null),
    [contourMesh, linkStreamsMesh],
  );

  useEffect(() => {
    let progress = 0.18;
    if (terrainDepthTexture) progress += 0.3;
    if (contourMesh) progress += 0.16;
    if (linkStreamsMesh) progress += 0.14;
    onSceneProgress(progress);
  }, [contourMesh, linkStreamsMesh, onSceneProgress, terrainDepthTexture]);

  return (
    <div className="sticky top-0 z-0 h-svh w-full md:absolute md:inset-0">
      <SaveConfigButton values={settings} />
      <SceneErrorBoundary onError={onSceneError}>
        <Canvas
          camera={{position: CAMERA_CONFIG.overviewPosition, fov: CAMERA_CONFIG.fov}}
          fallback={null}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          onCreated={() => onSceneProgress(0.18)}
        >

        {isDevelopment ? (
          <StatsGl className="fixed right-0 bottom-0 z-10000" />
        ) : null}
        
        <color attach="background" args={[FOG_CONFIG.color]} />
        {isDevelopment ? (
          <OrbitControls
            ref={orbitcontrolsRef}
            target={CAMERA_CONFIG.overviewLookAt}
            makeDefault
          />
        ) : null}
        <CameraFrameProvider>
          <CameraRig
            activeId={activeId}
            controlsRef={isDevelopment ? orbitcontrolsRef : undefined}
          />
          {isDevelopment ? (
            <SaveCameraButton activeId={activeId} controlsRef={orbitcontrolsRef} />
          ) : null}
          <SceneFog settings={settings.fog} />
          <Suspense fallback={null}>
            <CachedTerrain
              fogSettings={settings.fog}
              onDepthTextureChange={setTerrainDepthTexture}
              terrainSettings={settings.terrain}
            />
            <ContourLines
              ref={setContourMesh}
              contourSettings={settings.contours}
              terrainDepthTexture={terrainDepthTexture}
              terrainSettings={settings.terrain}
            />
            <DecorStreams
              contourSettings={settings.contours}
              decorStreamSettings={settings.decorStreams}
              terrainSettings={settings.terrain}
            />
            <LinkStreams
              ref={setLinkStreamsMesh}
              activeId={activeId}
              contourSettings={settings.contours}
              linkStreamSettings={settings.linkStreams}
              onStreamClick={onStreamClick}
              terrainSettings={settings.terrain}
            />
            <SceneHeroName
              contourSettings={settings.contours}
              isHidden={activeId !== null}
              introStarted={introStarted}
              terrainSettings={settings.terrain}
            />
            <SceneReadySignal
              enabled={bloomSelection.length === 2}
              onProgress={onSceneProgress}
              onReady={onSceneReady}
            />
          </Suspense>
        </CameraFrameProvider>
        {/* Keep the composer single-sampled: MSAA resolve blits intermittently
            present empty frames on some GPUs. Color-only SMAA smooths edges
            without requesting the composer's sampled depth texture. */}
        {bloomSelection.length === 2 ? (
          <EffectComposer multisampling={0}>
            <ColorOnlySMAA preset={SMAAPreset.MEDIUM} />
            <IsolatedBloom
              selection={bloomSelection}
              // Preserve the one-pixel contour and glyph cores before the
              // bloom mip chain downsamples them.
              resolutionScale={1}
              intensity={settings.postProcessing.bloomIntensity}
              luminanceThreshold={settings.postProcessing.bloomThreshold}
              luminanceSmoothing={settings.postProcessing.bloomSmoothing}
            />
          </EffectComposer>
        ) : null}
        </Canvas>
      </SceneErrorBoundary>
    </div>
  );
}
