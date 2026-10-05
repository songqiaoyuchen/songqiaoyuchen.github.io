'use client';

import {Suspense, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, StatsGl } from '@react-three/drei';
import { EffectComposer } from '@react-three/postprocessing';
import { SMAAPreset } from 'postprocessing';
import type {DepthTexture, Mesh} from 'three';
import type { OrbitControls as OrbitControlsInstance } from 'three-stdlib';
import type {useCreateStore} from 'leva';
import {CAMERA_CONFIG, FOG_CONFIG} from '@/config/scene';
import { SaveCameraButton } from '@/components/debug/SaveCameraButton';
import {ArtCameraControls} from '@/components/debug/ArtCameraControls';
import {ArtTransitionControls} from '@/components/debug/ArtTransitionControls';
import {useArtScene} from '@/components/artworks/ArtSceneContext';
import {ArtCaptureExport} from './ArtCaptureExport';
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
import type {ArtMedium} from '@/data/artworks';
import {waitForHealthyFrames} from '@/lib/performance/frameBudget';
import {
  retainTerrainPipeline,
  scheduleTerrainPipelineDisposal,
} from '@/lib/terrain/assets';

type TerrainBackgroundProps = {
  artActive?: boolean;
  artCameraEditing?: boolean;
  artCameraStore: ReturnType<typeof useCreateStore>;
  onArtCameraEditingChange: (editing: boolean) => void;
  artMedium?: ArtMedium | null;
  activeId: SectionId | null;
  onPoseSettled?: (pose: SectionId | null | undefined) => void;
  introStarted: boolean;
  onSceneError: (error: Error) => void;
  onSceneProgress: (progress: number) => void;
  onSceneReady: () => void;
  onStreamClick: (id: SectionId) => void;
};

export function TerrainBackground({
  artActive = false,
  artCameraEditing = false,
  artCameraStore,
  onArtCameraEditingChange,
  artMedium = null,
  activeId,
  onPoseSettled,
  introStarted,
  onSceneError,
  onSceneProgress,
  onSceneReady,
  onStreamClick,
}: TerrainBackgroundProps) {
  const orbitcontrolsRef = useRef<OrbitControlsInstance>(null);
  const {capture} = useArtScene();
  const capturing = artActive && capture.enabled;
  const [assemblyPhase, setAssemblyPhase] = useState(0);
  const [canvasReady, setCanvasReady] = useState(false);
  const [contourMesh, setContourMesh] = useState<Mesh | null>(null);
  const [decorStreamsMesh, setDecorStreamsMesh] = useState<Mesh | null>(null);
  const [heroMesh, setHeroMesh] = useState<Mesh | null>(null);
  const [linkStreamsMesh, setLinkStreamsMesh] = useState<Mesh | null>(null);
  const [bloomReady, setBloomReady] = useState(false);
  const [terrainDepthTexture, setTerrainDepthTexture] = useState<DepthTexture | null>(null);
  const isDevelopment = process.env.NODE_ENV === 'development';
  const settings = useSceneControls();
  const hideHomeScene = artActive || activeId === 'art';
  const bloomSelection = useMemo(
    () => [contourMesh, linkStreamsMesh]
      .filter((mesh): mesh is Mesh => mesh !== null),
    [contourMesh, linkStreamsMesh],
  );
  const handleBloomReady = useCallback(() => setBloomReady(true), []);

  useEffect(() => {
    retainTerrainPipeline();
    return scheduleTerrainPipelineDisposal;
  }, []);

  useEffect(() => {
    const targetPhase = !canvasReady
      ? 0
      : !terrainDepthTexture
        ? 1
        : !contourMesh
          ? 2
          : !(decorStreamsMesh && heroMesh && linkStreamsMesh)
            ? 3
            : assemblyPhase < 4
              ? 4
              : assemblyPhase < 5
                ? 5
                : bloomReady
                  ? 6
                  : 5;
    if (targetPhase <= assemblyPhase) return;
    let cancelled = false;
    void waitForHealthyFrames().then(() => {
      if (!cancelled) {
        setAssemblyPhase(targetPhase);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    assemblyPhase,
    bloomReady,
    bloomSelection.length,
    canvasReady,
    contourMesh,
    decorStreamsMesh,
    heroMesh,
    linkStreamsMesh,
    terrainDepthTexture,
  ]);

  useEffect(() => {
    let progress = 0.18;
    if (terrainDepthTexture) progress += 0.3;
    if (contourMesh) progress += 0.16;
    if (linkStreamsMesh) progress += 0.14;
    onSceneProgress(progress);
  }, [contourMesh, linkStreamsMesh, onSceneProgress, terrainDepthTexture]);

  return (
    <div data-art-capture-frame={capturing || undefined} className={artActive
      ? `${artCameraEditing ? 'pointer-events-auto' : 'pointer-events-none'} fixed inset-0 z-0 h-svh w-full`
      : 'sticky top-0 z-0 h-svh w-full md:absolute md:inset-0'}>
      {!artMedium && <SaveConfigButton values={settings} />}
      <SceneErrorBoundary onError={onSceneError}>
        <Canvas
          camera={{position: CAMERA_CONFIG.overviewPosition, fov: CAMERA_CONFIG.fov}}
          fallback={null}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          onCreated={() => {
            setCanvasReady(true);
            onSceneProgress(0.18);
          }}
        >

        {isDevelopment && !artMedium ? (
          <StatsGl className="fixed right-0 bottom-0 z-10000" />
        ) : null}
        
        <color attach="background" args={[FOG_CONFIG.color]} />
        {isDevelopment ? (
          <OrbitControls
            ref={orbitcontrolsRef}
            enabled={artActive ? artCameraEditing : activeId !== 'art'}
            enableDamping={!artActive && activeId !== 'art'}
            target={CAMERA_CONFIG.overviewLookAt}
            makeDefault
          />
        ) : null}
        <CameraFrameProvider>
          <CameraRig
            activeId={activeId}
            onPoseSettled={onPoseSettled}
            controlsRef={isDevelopment ? orbitcontrolsRef : undefined}
          />
          {isDevelopment && !artActive && activeId !== 'art' ? (
            <SaveCameraButton activeId={activeId} controlsRef={orbitcontrolsRef} />
          ) : null}
          {isDevelopment && artActive && !capturing ? (
            <>
              <ArtCameraControls store={artCameraStore} controlsRef={orbitcontrolsRef}
                onEditingChange={onArtCameraEditingChange} />
              <ArtTransitionControls store={artCameraStore} />
            </>
          ) : null}
          <SceneFog settings={settings.fog} />
          <Suspense fallback={null}>
            {assemblyPhase >= 1 ? (
            <CachedTerrain
              contourSettings={settings.contours}
              artMedium={artMedium}
              preloadIllustrations={hideHomeScene}
              fogSettings={settings.fog}
              onDepthTextureChange={setTerrainDepthTexture}
              terrainSettings={settings.terrain}
            />
            ) : null}
            {assemblyPhase >= 2 ? (
            <ContourLines
              hidden={hideHomeScene}
              ref={setContourMesh}
              contourSettings={settings.contours}
              terrainDepthTexture={terrainDepthTexture}
              terrainSettings={settings.terrain}
            />
            ) : null}
            {assemblyPhase >= 3 ? (
              <>
            <DecorStreams
              hidden={hideHomeScene}
              ref={setDecorStreamsMesh}
              contourSettings={settings.contours}
              decorStreamSettings={settings.decorStreams}
              terrainSettings={settings.terrain}
            />
            <LinkStreams
              hidden={hideHomeScene}
              ref={setLinkStreamsMesh}
              activeId={activeId}
              contourSettings={settings.contours}
              linkStreamSettings={settings.linkStreams}
              onStreamClick={onStreamClick}
              terrainSettings={settings.terrain}
            />
            <SceneHeroName
              ref={setHeroMesh}
              contourSettings={settings.contours}
              isHidden={hideHomeScene || activeId !== null}
              introStarted={introStarted}
              terrainSettings={settings.terrain}
            />
              </>
            ) : null}
            <SceneReadySignal
              enabled={assemblyPhase >= 6}
              onProgress={onSceneProgress}
              onReady={onSceneReady}
            />
          </Suspense>
        </CameraFrameProvider>
        {/* Keep the composer single-sampled: MSAA resolve blits intermittently
            present empty frames on some GPUs. Color-only SMAA smooths edges
            without requesting the composer's sampled depth texture. */}
        {assemblyPhase >= 4 && bloomSelection.length === 2 ? (
          <EffectComposer multisampling={0}>
            <ColorOnlySMAA preset={SMAAPreset.MEDIUM} />
            {assemblyPhase >= 5 ? (
            <IsolatedBloom
              onReady={handleBloomReady}
              selection={bloomSelection}
              // Preserve the one-pixel contour and glyph cores before the
              // bloom mip chain downsamples them.
              resolutionScale={1}
              intensity={settings.postProcessing.bloomIntensity}
              luminanceThreshold={settings.postProcessing.bloomThreshold}
              luminanceSmoothing={settings.postProcessing.bloomSmoothing}
            />
            ) : <></>}
          </EffectComposer>
        ) : null}
        {capturing && assemblyPhase >= 4 && bloomSelection.length === 2 ? <ArtCaptureExport /> : null}
        </Canvas>
      </SceneErrorBoundary>
    </div>
  );
}
