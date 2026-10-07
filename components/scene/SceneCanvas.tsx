// The persistent R3F canvas behind Home and Art: camera, terrain, contours, scene text and bloom.
// Layers mount in stages (useSceneAssembly); keep child order, since useFrame order follows it.
'use client';

import {Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject} from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, StatsGl } from '@react-three/drei';
import { EffectComposer } from '@react-three/postprocessing';
import {SMAAPreset, type EffectComposer as EffectComposerImpl} from 'postprocessing';
import type {DepthTexture, Mesh} from 'three';
import type { OrbitControls as OrbitControlsInstance } from 'three-stdlib';
import type {useCreateStore} from 'leva';
import {CAMERA_CONFIG, FOG_CONFIG, type CameraPose} from '@/config/scene';
import {useArtScene} from '@/components/art/ArtSceneContext';
import type {ArtMedium} from '@/data/artworks';
import type {SectionId} from '@/data/sections';
import {
  retainTerrainPipeline,
  scheduleTerrainPipelineDisposal,
} from '@/lib/terrain/assets';
import {AboutPath} from './about/AboutPath';
import {CaptureExport} from './backdrop/CaptureExport';
import {CameraFrameProvider} from './camera/CameraFrameState';
import { CameraRig } from './camera/CameraRig';
import {ArtCameraControls} from './controls/ArtCameraControls';
import {ArtCursorControls} from './controls/ArtCursorControls';
import {ArtTransitionControls} from './controls/ArtTransitionControls';
import { SaveCameraButton } from './controls/SaveCameraButton';
import { SaveConfigButton } from './controls/SaveConfigButton';
import {useSceneControls} from './controls/useSceneControls';
import { ColorOnlySMAA } from './effects/ColorOnlySMAA';
import {IsolatedBloom} from './effects/IsolatedBloom';
import {SceneErrorBoundary} from './SceneErrorBoundary';
import {SceneReadySignal} from './SceneReadySignal';
import {StillFrameGate} from './StillFrameGate';
import {CachedTerrain} from './terrain/CachedTerrain';
import { Contours } from './terrain/Contours';
import {ABOUT_MAP_CONFIG} from '@/config/scene/aboutPath';
import { SceneFog } from './terrain/SceneFog';
import { GlyphRain } from './text/GlyphRain';
import {SceneHeroName} from './text/SceneHeroName';
import {SceneLinks} from './text/SceneLinks';
import {useSceneAssembly} from './useSceneAssembly';

type SceneCanvasProps = {
  artActive?: boolean;
  artCameraEditing?: boolean;
  artCameraStore: ReturnType<typeof useCreateStore>;
  onArtCameraEditingChange: (editing: boolean) => void;
  /** Backdrop to show on Art; null keeps the plain terrain. */
  backdrop?: ArtMedium | null;
  activeId: SectionId | null;
  /** About checkpoint being read (-1 for none); see AboutPath. */
  aboutStop: number;
  aboutProgressRef: MutableRefObject<number>;
  onAboutSelect: (stop: number) => void;
  onPoseSettled?: (pose: SectionId | null | undefined) => void;
  introStarted: boolean;
  onSceneError: (error: Error) => void;
  onSceneProgress: (progress: number) => void;
  onSceneReady: () => void;
  onLinkClick: (id: SectionId) => void;
};

export function SceneCanvas({
  artActive = false,
  artCameraEditing = false,
  artCameraStore,
  onArtCameraEditingChange,
  backdrop = null,
  activeId,
  aboutStop,
  aboutProgressRef,
  onAboutSelect,
  onPoseSettled,
  introStarted,
  onSceneError,
  onSceneProgress,
  onSceneReady,
  onLinkClick,
}: SceneCanvasProps) {
  const orbitcontrolsRef = useRef<OrbitControlsInstance>(null);
  const composerRef = useRef<EffectComposerImpl>(null);
  const aboutFocusPosesRef = useRef<readonly CameraPose[]>([]);
  const {capture} = useArtScene();
  const capturing = artActive && capture.enabled;
  const [canvasReady, setCanvasReady] = useState(false);
  const [contourMesh, setContourMesh] = useState<Mesh | null>(null);
  const [glyphRainMesh, setGlyphRainMesh] = useState<Mesh | null>(null);
  const [heroMesh, setHeroMesh] = useState<Mesh | null>(null);
  const [sceneLinksMesh, setSceneLinksMesh] = useState<Mesh | null>(null);
  const [aboutPathMesh, setAboutPathMesh] = useState<Mesh | null>(null);
  const [bloomReady, setBloomReady] = useState(false);
  const [terrainDepthTexture, setTerrainDepthTexture] = useState<DepthTexture | null>(null);
  const isDevelopment = process.env.NODE_ENV === 'development';
  const settings = useSceneControls();
  const hideHomeScene = artActive || activeId === 'art';
  // Sections with their own journey (Art, About) clear the homepage text: glyph rain and scene links.
  const hideSceneText = hideHomeScene || activeId === 'about';
  const isAbout = activeId === 'about';
  // About's map contours are built the first time About opens, then kept.
  const [aboutMapWanted, setAboutMapWanted] = useState(isAbout);
  if (isAbout && !aboutMapWanted) setAboutMapWanted(true);
  const aboutMapSettings = useMemo(
    () => ({...settings.contours, ...ABOUT_MAP_CONFIG.contours}),
    [settings.contours],
  );
  // Contours and scene links must be ready before the composer; the About path joins when mounted.
  const bloomBaseReady = contourMesh !== null && sceneLinksMesh !== null;
  const bloomSelection = useMemo(
    () => [contourMesh, sceneLinksMesh, aboutPathMesh]
      .filter((mesh): mesh is Mesh => mesh !== null),
    [aboutPathMesh, contourMesh, sceneLinksMesh],
  );
  const handleBloomReady = useCallback(() => setBloomReady(true), []);

  useEffect(() => {
    retainTerrainPipeline();
    return scheduleTerrainPipelineDisposal;
  }, []);

  const assemblyPhase = useSceneAssembly({
    canvasReady,
    terrainDepthTexture,
    contourMesh,
    glyphRainMesh,
    heroMesh,
    sceneLinksMesh,
    bloomReady,
    bloomSelectionCount: bloomSelection.length,
    onSceneProgress,
  });

  return (
    <div data-art-capture-frame={capturing || undefined} className={artActive
      ? `${artCameraEditing ? 'pointer-events-auto' : 'pointer-events-none'} fixed inset-0 z-0 h-svh w-full`
      : 'sticky top-0 z-0 h-svh w-full md:absolute md:inset-0'}>
      {!backdrop && <SaveConfigButton values={settings} />}
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
          {isDevelopment && !backdrop ? (
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
              aboutStop={aboutStop}
              aboutFocusPosesRef={aboutFocusPosesRef}
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
                <ArtCursorControls store={artCameraStore} />
              </>
            ) : null}
            <SceneFog settings={settings.fog} />
            <Suspense fallback={null}>
              {assemblyPhase >= 1 ? (
                <CachedTerrain
                  contourSettings={settings.contours}
                  backdrop={backdrop}
                  preloadBackdrops={hideHomeScene}
                  fogSettings={settings.fog}
                  onDepthTextureChange={setTerrainDepthTexture}
                  terrainSettings={settings.terrain}
                />
              ) : null}
              {assemblyPhase >= 2 ? (
                <Contours
                  hidden={hideHomeScene || isAbout}
                  ref={setContourMesh}
                  contourSettings={settings.contours}
                  terrainDepthTexture={terrainDepthTexture}
                  terrainSettings={settings.terrain}
                />
              ) : null}
              {assemblyPhase >= 3 ? (
                <>
                  <GlyphRain
                    hidden={hideSceneText}
                    ref={setGlyphRainMesh}
                    contourSettings={settings.contours}
                    glyphRainSettings={settings.glyphRain}
                    terrainSettings={settings.terrain}
                  />
                  <SceneLinks
                    hidden={hideSceneText}
                    ref={setSceneLinksMesh}
                    activeId={activeId}
                    contourSettings={settings.contours}
                    sceneLinkSettings={settings.sceneLinks}
                    onLinkClick={onLinkClick}
                    terrainSettings={settings.terrain}
                  />
                  <SceneHeroName
                    ref={setHeroMesh}
                    contourSettings={settings.contours}
                    isHidden={hideHomeScene || activeId !== null}
                    introStarted={introStarted}
                    terrainSettings={settings.terrain}
                  />
                  {aboutMapWanted ? (
                    <Contours
                      hidden={!isAbout}
                      focus={ABOUT_MAP_CONFIG.focus}
                      lighting={ABOUT_MAP_CONFIG.lighting}
                      minPixels={ABOUT_MAP_CONFIG.minPixels}
                      contourSettings={aboutMapSettings}
                      terrainDepthTexture={terrainDepthTexture}
                      terrainSettings={settings.terrain}
                    />
                  ) : null}
                  <AboutPath
                    meshRef={setAboutPathMesh}
                    visible={!hideHomeScene && activeId === 'about'}
                    activeStop={aboutStop}
                    progressRef={aboutProgressRef}
                    settings={settings.aboutPath}
                    terrainSettings={settings.terrain}
                    terrainDepthTexture={terrainDepthTexture}
                    focusPosesRef={aboutFocusPosesRef}
                    onSelect={onAboutSelect}
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
          {assemblyPhase >= 4 && bloomBaseReady ? (
            <EffectComposer ref={composerRef} multisampling={0}>
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
          {capturing && assemblyPhase >= 4 && bloomBaseReady ? <CaptureExport /> : null}
          <StillFrameGate enabled={hideHomeScene && assemblyPhase >= 6 && !capturing} composerRef={composerRef} />
        </Canvas>
      </SceneErrorBoundary>
    </div>
  );
}
