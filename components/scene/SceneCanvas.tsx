// The persistent R3F canvas behind Home, About, Art and Travel: camera, terrain, contours, scene text, the About
// path, the Travel globe and bloom. Layers mount in stages (useSceneAssembly); keep child order, since useFrame
// order follows it.
'use client';

import {memo, Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject} from 'react';
import {Canvas, type RootState} from '@react-three/fiber';
import { OrbitControls, StatsGl } from '@react-three/drei';
import { EffectComposer } from '@react-three/postprocessing';
import {SMAAPreset, type EffectComposer as EffectComposerImpl} from 'postprocessing';
import type {DepthTexture, Mesh, Object3D, Texture} from 'three';
import type { OrbitControls as OrbitControlsInstance } from 'three-stdlib';
import type {useCreateStore} from 'leva';
import {CAMERA_CONFIG, FOG_CONFIG} from '@/config/scene';
import {useArtCapture} from '@/components/art/ArtSceneContext';
import type {ArtMedium} from '@/data/artworks';
import type {SectionId} from '@/data/sections';
import {
  retainTerrainPipeline,
  scheduleTerrainPipelineDisposal,
} from '@/lib/terrain/assets';
import type {AboutFraming} from '@/lib/scene/aboutPath';
import {AboutMap} from './about/AboutMap';
import {AboutPath} from './about/AboutPath';
import {CaptureExport} from './backdrop/CaptureExport';
import {CameraFrameProvider} from './camera/CameraFrameState';
import { CameraRig } from './camera/CameraRig';
import {ArtCameraControls} from './controls/ArtCameraControls';
import {ArtCursorControls} from './controls/ArtCursorControls';
import {ArtTransitionControls} from './controls/ArtTransitionControls';
import { SaveCameraButton } from './controls/SaveCameraButton';
import { TravelTripScope } from './controls/sectionScope';
import { SaveConfigButton } from './controls/SaveConfigButton';
import {useSceneControls} from './controls/useSceneControls';
import { ColorOnlySMAA } from './effects/ColorOnlySMAA';
import {IsolatedBloom} from './effects/IsolatedBloom';
import {PrecompileHidden} from './PrecompileHidden';
import {SceneErrorBoundary} from './SceneErrorBoundary';
import {SceneReadySignal} from './SceneReadySignal';
import {StillFrameGate} from './StillFrameGate';
import {CachedTerrain} from './terrain/CachedTerrain';
import { Contours } from './terrain/Contours';
import {ABOUT_MAP_CONFIG} from '@/config/scene/aboutPath';

// Memoized: a layer re-renders only when its own props change, not with every render of the canvas (a context
// above it, a mesh ref settling). The props they take are state, refs, memoized objects and stable callbacks.
const Fog = memo(SceneFog);
const Terrain = memo(CachedTerrain);
const ContourLines = memo(Contours);
const Rain = memo(GlyphRain);
const HeroName = memo(SceneHeroName);
const Links = memo(SceneLinks);
const AboutMapLines = memo(AboutMap);
const AboutRoute = memo(AboutPath);
const Globe = memo(TravelGlobe);

const ABOUT_EDIT_ROTATE_SPEED = 0.3;
import {TRAVEL_OVERVIEW_CONFIG} from '@/config/scene/travel';
import { SceneFog } from './terrain/SceneFog';
import { GlyphRain } from './text/GlyphRain';
import {SceneHeroName} from './text/SceneHeroName';
import {SceneLinks} from './text/SceneLinks';
import {TravelGlobe} from './travel/TravelGlobe';
import type {GlobeFront} from '@/components/travel/TravelSceneContext';
import type {GlobeOutline} from '@/components/travel/useTripSheetPlacement';
import {useSceneAssembly} from './useSceneAssembly';

// Quiet delay after the intro starts before the Travel globe (and its map) is built in the background, and a
// further one before Art's backdrop paintings are decoded and uploaded, so the two never share a frame.
const TRAVEL_PREFETCH_MS = 2500;
const BACKDROP_PREFETCH_MS = 5000;
// Then the About map's contours are built by the terrain worker, so the first About journey finds them ready.
const ABOUT_MAP_PREFETCH_MS = 7500;

// The Canvas re-measures itself on each of its own renders, which every context above it triggers (it bridges
// them all: the router's on every navigation, Travel's on every hover, capture and selection). Its measured rect
// carries more keys than the stored size, so @react-three/fiber 9.5 takes it for a new one and replaces the store's
// size and viewport unchanged, and every layer reading them re-renders in the middle of a camera journey. Skip the
// replacement while the numbers are the same.
function keepCanvasSize(state: RootState) {
  const {setSize} = state;
  state.set({
    setSize: (width, height, top = 0, left = 0) => {
      const {size} = state.get();
      if (size.width === width && size.height === height && size.top === top && size.left === left) return;
      setSize(width, height, top, left);
    },
  });
}

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
  /** Travel: opening a trip, the trip under the pointer and the trip the globe rests on (the selected and hovered
   * trips themselves reach the globe and the camera through TravelSceneContext). */
  onTravelSelect: (id: string) => void;
  onTravelHover: (id: string | null) => void;
  onTravelCapture: (id: string | null) => void;
  /** Receives the globe's circle on screen every frame (the trip panel keeps clear of it). */
  travelGlobeOutlineRef: MutableRefObject<GlobeOutline | null>;
  /** Receives the place at the globe's centre every frame (the trip index's meridian strip). */
  travelGlobeFrontRef: MutableRefObject<GlobeFront | null>;
  onPoseSettled?: (pose: SectionId | null | undefined) => void;
  introStarted: boolean;
  onSceneError: (error: Error) => void;
  onSceneProgress: (progress: number) => void;
  onSceneReady: () => void;
  onLinkClick: (id: SectionId) => void;
};

// Memoized: SceneShell re-renders on every pose settling; with stable props the canvas tree (and its per-layer
// hooks) is left alone, so camera journeys keep their frames.
export const SceneCanvas = memo(function SceneCanvas({
  artActive = false,
  artCameraEditing = false,
  artCameraStore,
  onArtCameraEditingChange,
  backdrop = null,
  activeId,
  aboutStop,
  aboutProgressRef,
  onAboutSelect,
  onTravelSelect,
  onTravelHover,
  onTravelCapture,
  travelGlobeOutlineRef,
  travelGlobeFrontRef,
  onPoseSettled,
  introStarted,
  onSceneError,
  onSceneProgress,
  onSceneReady,
  onLinkClick,
}: SceneCanvasProps) {
  const orbitcontrolsRef = useRef<OrbitControlsInstance>(null);
  // Development: Save Camera reads the open trip's marker offset through this (TravelGlobe fills it).
  const travelMeasureOffsetRef = useRef<(() => [number, number] | null) | null>(null);
  const composerRef = useRef<EffectComposerImpl>(null);
  const aboutFramingRef = useRef<AboutFraming | null>(null);
  const {capture} = useArtCapture();
  const capturing = artActive && capture.enabled;
  const [canvasReady, setCanvasReady] = useState(false);
  const [contourMesh, setContourMesh] = useState<Mesh | null>(null);
  const [glyphRainMesh, setGlyphRainMesh] = useState<Mesh | null>(null);
  const [heroMesh, setHeroMesh] = useState<Mesh | null>(null);
  const [sceneLinksMesh, setSceneLinksMesh] = useState<Mesh | null>(null);
  const [aboutPathMesh, setAboutPathMesh] = useState<Mesh | null>(null);
  const [travelBloom, setTravelBloom] = useState<Object3D[]>([]);
  const [bloomReady, setBloomReady] = useState(false);
  const [terrainDepthTexture, setTerrainDepthTexture] = useState<DepthTexture | null>(null);
  const [terrainColorTexture, setTerrainColorTexture] = useState<Texture | null>(null);
  const isDevelopment = process.env.NODE_ENV === 'development';
  const settings = useSceneControls(activeId);
  const hideHomeScene = artActive || activeId === 'art';
  const isAbout = activeId === 'about';
  const isTravel = activeId === 'travel';
  // Sections with their own journey (Art, About, Travel) clear the homepage text: glyph rain and scene links.
  const hideSceneText = hideHomeScene || isAbout || isTravel;
  // About's map contours and the Travel globe are built when their section first opens, or quietly a moment after
  // the intro starts (the timers below), so each is in hand, its shaders compiled, before its first journey.
  const [aboutMapWanted, setAboutMapWanted] = useState(isAbout);
  if (isAbout && !aboutMapWanted) setAboutMapWanted(true);
  const [travelWanted, setTravelWanted] = useState(isTravel);
  if (isTravel && !travelWanted) setTravelWanted(true);
  useEffect(() => {
    if (travelWanted || !introStarted) return;
    const timer = window.setTimeout(() => setTravelWanted(true), TRAVEL_PREFETCH_MS);
    return () => window.clearTimeout(timer);
  }, [introStarted, travelWanted]);
  const [backdropsWanted, setBackdropsWanted] = useState(false);
  useEffect(() => {
    if (backdropsWanted || !introStarted) return;
    const timer = window.setTimeout(() => setBackdropsWanted(true), BACKDROP_PREFETCH_MS);
    return () => window.clearTimeout(timer);
  }, [backdropsWanted, introStarted]);
  useEffect(() => {
    if (aboutMapWanted || !introStarted) return;
    const timer = window.setTimeout(() => setAboutMapWanted(true), ABOUT_MAP_PREFETCH_MS);
    return () => window.clearTimeout(timer);
  }, [aboutMapWanted, introStarted]);
  // Each hidden layer mounting (the globe; the About map) gets its shaders compiled while the scene is quiet.
  const precompileRevision = (travelWanted ? 1 : 0) + (aboutMapWanted ? 2 : 0);
  // The dev orbit camera: free on the overview and the drawer sections, on About and Travel only while Leva's Edit
  // camera is on.
  const cameraEditable = activeId !== 'art'
    && (activeId !== 'about' || settings.aboutPath.editCamera)
    && (activeId !== 'travel' || settings.travel.editCamera);
  const aboutMapSettings = useMemo(
    () => ({...settings.contours, ...ABOUT_MAP_CONFIG.contours}),
    [settings.contours],
  );
  // The riding landscape lands on the overview's ground: a trip's own look only eases in once the globe has formed.
  const {baseColor: travelBase, lineColor: travelLine} = settings.travel;
  const travelTint = settings.travelOverview.landTint;
  const travelLook = useMemo(
    () => ({baseColor: travelBase, lineColor: travelLine, landTint: travelTint, shade: TRAVEL_OVERVIEW_CONFIG.shade}),
    [travelBase, travelLine, travelTint],
  );
  const {journeySeconds: travelJourney} = settings.travel;
  const {focusSeconds: travelFocus} = settings.travelTrip;
  const travelSeconds = useMemo(
    () => ({journeySeconds: travelJourney, focusSeconds: travelFocus}), [travelFocus, travelJourney]);
  // Contours and scene links must be ready before the composer; the About path and Travel lines join when mounted.
  const bloomBaseReady = contourMesh !== null && sceneLinksMesh !== null;
  const bloomSelection = useMemo(
    () => [
      ...[contourMesh, sceneLinksMesh, aboutPathMesh].filter((mesh): mesh is Mesh => mesh !== null),
      ...travelBloom,
    ],
    [aboutPathMesh, contourMesh, sceneLinksMesh, travelBloom],
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

  // The composer rebuilds its pass whenever its children are new elements, which every render of this component
  // would make; hold them so only a post-processing change (or the bloom joining) rebuilds the pass.
  const {bloomIntensity, bloomThreshold, bloomSmoothing} = settings.postProcessing;
  const composer = useMemo(
    () => (
      <EffectComposer ref={composerRef} multisampling={0}>
        <ColorOnlySMAA preset={SMAAPreset.MEDIUM} />
        {assemblyPhase >= 5 ? (
          <IsolatedBloom
            onReady={handleBloomReady}
            selection={bloomSelection}
            // Preserve the one-pixel contour and glyph cores before the
            // bloom mip chain downsamples them.
            resolutionScale={1}
            intensity={bloomIntensity}
            luminanceThreshold={bloomThreshold}
            luminanceSmoothing={bloomSmoothing}
          />
        ) : <></>}
      </EffectComposer>
    ),
    [assemblyPhase, bloomIntensity, bloomSelection, bloomSmoothing, bloomThreshold, handleBloomReady],
  );

  return (
    // Viewport-wide (100vw, under any scrollbar) rather than the container's width: a scrollbar coming or going
    // between routes would otherwise resize the canvas mid-journey, and a resized canvas is blank for a frame.
    <div data-art-capture-frame={capturing || undefined} className={artActive
      ? `${artCameraEditing ? 'pointer-events-auto' : 'pointer-events-none'} fixed inset-0 z-0 h-svh w-screen`
      : 'sticky top-0 z-0 h-svh w-screen md:absolute md:inset-0'}>
      {!backdrop && <SaveConfigButton values={settings} />}
      <SceneErrorBoundary onError={onSceneError}>
        <Canvas
          camera={{position: CAMERA_CONFIG.overviewPosition, fov: CAMERA_CONFIG.fov}}
          fallback={null}
          // Opaque: the scene paints its own background, so the compositor can blit the canvas instead of
          // blending it over the page every frame (the full viewport at device pixel ratio).
          gl={{antialias: false, alpha: false, powerPreference: 'high-performance'}}
          onCreated={(state) => {
            keepCanvasSize(state);
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
              // Off on About: its camera is authored (pose, checkpoint framing); the route editor owns the pointer.
              // Off on Travel too, where the pointer turns the globe. On either, Leva's Edit camera takes it.
              enabled={artActive ? artCameraEditing : cameraEditable}
              // Composing About's pose: slower turns, so a drag nudges the view rather than swinging it.
              rotateSpeed={activeId === 'about' ? ABOUT_EDIT_ROTATE_SPEED : 1}
              enableDamping={!artActive && cameraEditable}
              target={CAMERA_CONFIG.overviewLookAt}
              makeDefault
            />
          ) : null}
          <CameraFrameProvider>
            <CameraRig
              activeId={activeId}
              aboutStop={aboutStop}
              aboutFramingRef={aboutFramingRef}
              aboutSeconds={settings.aboutPath}
              travelSeconds={travelSeconds}
              onPoseSettled={onPoseSettled}
              controlsRef={isDevelopment ? orbitcontrolsRef : undefined}
            />
            {isDevelopment ? <TravelTripScope /> : null}
            {isDevelopment && !artActive && activeId !== 'art' ? (
              <SaveCameraButton
                activeId={activeId}
                controlsRef={orbitcontrolsRef}
                measureTravelOffset={travelMeasureOffsetRef}
              />
            ) : null}
            {isDevelopment && artActive && !capturing ? (
              <>
                <ArtCameraControls store={artCameraStore} controlsRef={orbitcontrolsRef}
                  onEditingChange={onArtCameraEditingChange} />
                <ArtTransitionControls store={artCameraStore} />
                <ArtCursorControls store={artCameraStore} />
              </>
            ) : null}
            <Fog about={activeId === 'about'} settings={settings.fog} />
            <Suspense fallback={null}>
              {assemblyPhase >= 1 ? (
                <Terrain
                  contourSettings={settings.contours}
                  backdrop={backdrop}
                  preloadBackdrops={hideHomeScene || backdropsWanted}
                  fogSettings={settings.fog}
                  onDepthTextureChange={setTerrainDepthTexture}
                  onColorTextureChange={setTerrainColorTexture}
                  terrainSettings={settings.terrain}
                  travelLook={travelLook}
                />
              ) : null}
              {assemblyPhase >= 2 ? (
                <ContourLines
                  hidden={hideHomeScene || isAbout || isTravel}
                  travelRide
                  ref={setContourMesh}
                  contourSettings={settings.contours}
                  terrainDepthTexture={terrainDepthTexture}
                  terrainSettings={settings.terrain}
                />
              ) : null}
              {assemblyPhase >= 3 ? (
                <>
                  <Rain
                    hidden={hideSceneText}
                    ref={setGlyphRainMesh}
                    contourSettings={settings.contours}
                    glyphRainSettings={settings.glyphRain}
                    terrainSettings={settings.terrain}
                  />
                  <Links
                    hidden={hideSceneText}
                    ref={setSceneLinksMesh}
                    activeId={activeId}
                    contourSettings={settings.contours}
                    sceneLinkSettings={settings.sceneLinks}
                    onLinkClick={onLinkClick}
                    terrainSettings={settings.terrain}
                  />
                  <HeroName
                    ref={setHeroMesh}
                    contourSettings={settings.contours}
                    isHidden={hideHomeScene || activeId !== null}
                    introStarted={introStarted}
                    terrainSettings={settings.terrain}
                  />
                  {aboutMapWanted ? (
                    <AboutMapLines
                      hidden={!isAbout}
                      travelRide
                      contourSettings={aboutMapSettings}
                      terrainDepthTexture={terrainDepthTexture}
                      terrainSettings={settings.terrain}
                    />
                  ) : null}
                  <AboutRoute
                    meshRef={setAboutPathMesh}
                    visible={!hideHomeScene && activeId === 'about'}
                    activeStop={aboutStop}
                    progressRef={aboutProgressRef}
                    settings={settings.aboutPath}
                    terrainSettings={settings.terrain}
                    terrainDepthTexture={terrainDepthTexture}
                    framingRef={aboutFramingRef}
                    onSelect={onAboutSelect}
                  />
                  {travelWanted ? (
                    <Globe
                      visible={!hideHomeScene && isTravel}
                      editingCamera={settings.travel.editCamera}
                      measureOffsetRef={travelMeasureOffsetRef}
                      interactive={!settings.travel.editCamera}
                      settings={settings.travel}
                      overviewSettings={settings.travelOverview}
                      tripSettings={settings.travelTrip}
                      terrainDepthTexture={terrainDepthTexture}
                      terrainColorTexture={terrainColorTexture}
                      onBloomObjects={setTravelBloom}
                      onCapture={onTravelCapture}
                      globeOutlineRef={travelGlobeOutlineRef}
                      globeFrontRef={travelGlobeFrontRef}
                      onSelect={onTravelSelect}
                      onHover={onTravelHover}
                    />
                  ) : null}
                </>
              ) : null}
              <SceneReadySignal
                enabled={assemblyPhase >= 6}
                onProgress={onSceneProgress}
                onReady={onSceneReady}
              />
              {assemblyPhase >= 6 ? <PrecompileHidden composerRef={composerRef} revision={precompileRevision} /> : null}
            </Suspense>
          </CameraFrameProvider>
          {/* Keep the composer single-sampled: MSAA resolve blits intermittently
              present empty frames on some GPUs. Color-only SMAA smooths edges
              without requesting the composer's sampled depth texture. */}
          {assemblyPhase >= 4 && bloomBaseReady ? composer : null}
          {capturing && assemblyPhase >= 4 && bloomBaseReady ? <CaptureExport /> : null}
          <StillFrameGate enabled={assemblyPhase >= 6 && !capturing} composerRef={composerRef} />
        </Canvas>
      </SceneErrorBoundary>
    </div>
  );
});
