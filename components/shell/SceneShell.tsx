// Persistent shell for the Home, About, Art and Travel routes: one WebGL scene, the homepage hero/drawer/preloader,
// and the Art or Travel route content layered on top. Kept mounted across those routes so the canvas survives.
'use client';

import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {useCreateStore} from 'leva';
import {useArtScene} from '@/components/art/ArtSceneContext';
import {CapturePanel} from '@/components/art/capture/CapturePanel';
import type {AboutScrollRequest} from '@/components/home/drawer/about/useTimelineProgress';
import {Drawer} from '@/components/home/drawer/Drawer';
import {HeroLayer} from '@/components/home/hero/HeroLayer';
import {Preloader} from '@/components/home/preloader/Preloader';
import {HOME_OVERVIEW_EVENT} from '@/components/site/Nav';
import {useTravelScene} from '@/components/travel/TravelSceneContext';
import {ABOUT_STOP_IDS} from '@/data/about';
import type {SectionId} from '@/data/sections';
import type {ArticleSummary} from '@/lib/content/types';
import {AboutEntrySync} from './AboutEntrySync';
import {DevPanels} from './DevPanels';
import {TerrainFallback} from './TerrainFallback';
import {useSceneLoading} from './useSceneLoading';

const SceneCanvas = lazy(() =>
  import('@/components/scene/SceneCanvas').then(({SceneCanvas: Canvas}) => ({
    default: Canvas,
  })),
);

interface SceneShellProps {
  articles: readonly ArticleSummary[];
  children?: ReactNode;
}

export function SceneShell({articles, children}: SceneShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isArt = pathname.startsWith('/artworks');
  const isAbout = pathname === '/about';
  const isTravel = pathname.startsWith('/travel');
  const {backdrop, capture} = useArtScene();
  const travelScene = useTravelScene();
  // Blog and Projects are drawer state; Art, About and Travel are routes. A routed section is also held here for
  // the moment between its link click and its route arriving, so the camera and drawer start at once.
  const [previewId, setPreviewId] = useState<SectionId | null>(null);
  const activeId: SectionId | null = isArt ? 'art' : isAbout ? 'about' : isTravel ? 'travel' : previewId;
  // About: the timeline stop the drawer has settled on, and checkpoint clicks asking it to scroll.
  const [aboutStop, setAboutStop] = useState(-1);
  const [aboutScrollRequest, setAboutScrollRequest] = useState<AboutScrollRequest | null>(null);
  // The drawer's reading head in stops, read by the terrain path every frame.
  const aboutProgressRef = useRef(0);
  const [artCameraEditing, setArtCameraEditing] = useState(false);
  const artCameraStore = useCreateStore();
  const [settledPose, setSettledPose] = useState<SectionId | null | undefined>(
    isArt ? 'art' : isTravel ? 'travel' : null,
  );
  const {
    sceneState,
    sceneStarted,
    sceneProgress,
    showBypass,
    isReducedMotion,
    handleSceneReady,
    handleSceneProgress,
    handleSceneError,
    enterTerrainFallback,
  } = useSceneLoading(isArt || isTravel);

  // A routed section dismisses the old homepage preview, including entry via Nav.
  // Adjust before rendering so Home always returns to the landscape overview.
  if ((isArt || isAbout || isTravel) && previewId !== null) setPreviewId(null);
  // Leaving About returns its camera to the section pose and forgets where the drawer was: a reopened
  // panel starts at the top rather than scrolling back to the last checkpoint clicked.
  if (activeId !== 'about' && aboutStop !== -1) setAboutStop(-1);
  if (activeId !== 'about' && aboutScrollRequest !== null) setAboutScrollRequest(null);
  useEffect(() => {
    if (activeId !== 'about') aboutProgressRef.current = 0;
  }, [activeId]);

  // The settled entry lives in the URL (?entry=), replaced in place like Art's selection so scrolling adds no
  // history. The URL the page loaded with is left for AboutEntrySync to read first.
  const entrySynced = useRef(false);
  useEffect(() => {
    if (!isAbout) return;
    if (!entrySynced.current) {
      entrySynced.current = true;
      return;
    }
    const search = aboutStop >= 0 ? `?entry=${ABOUT_STOP_IDS[aboutStop]}` : '';
    if (window.location.search === search) return;
    window.history.replaceState(null, '', `${window.location.pathname}${search}`);
  }, [aboutStop, isAbout]);

  // SQYC on Home closes the open section (Nav cannot navigate to the page it is on).
  useEffect(() => {
    const returnToOverview = () => setPreviewId(null);
    window.addEventListener(HOME_OVERVIEW_EVENT, returnToOverview);
    return () => window.removeEventListener(HOME_OVERVIEW_EVENT, returnToOverview);
  }, []);

  function requestAboutStop(stop: number) {
    setAboutScrollRequest((current) => ({stop, key: (current?.key ?? 0) + 1}));
  }

  function toggleSection(id: SectionId) {
    if (id === 'art') {
      // Start from the live camera pose, even while the route is being fetched.
      setPreviewId('art');
      router.push('/artworks');
      return;
    }
    if (id === 'about') {
      if (isAbout) {
        router.push('/');
      } else {
        setPreviewId('about');
        router.push('/about');
      }
      return;
    }
    if (id === 'travel') {
      setPreviewId('travel');
      router.push('/travel');
      return;
    }
    setPreviewId((currentId) => (currentId === id ? null : id));
  }

  function closeSection() {
    if (isAbout) router.push('/');
    else setPreviewId(null);
  }

  const isRouted = isArt || isTravel;
  const isBlocking = !isRouted && (sceneState === 'loading' || sceneState === 'exiting');
  // Art and Travel content stays hidden until the camera has arrived at the section's pose.
  const artArriving = isArt && settledPose !== 'art' && sceneState !== 'fallback';
  const travelArriving = isTravel && settledPose !== 'travel' && sceneState !== 'fallback';

  return (
    <div
      className={`relative min-h-svh w-full bg-background text-foreground
        ${isArt ? 'art-environment' : isTravel ? 'travel-environment h-svh overflow-hidden' : 'h-svh overflow-hidden'}`}
      aria-busy={isBlocking}
      data-art-arriving={artArriving}
      data-travel-arriving={travelArriving}
      data-camera-editing={isArt && artCameraEditing}
    >
      <Suspense fallback={null}>
        <AboutEntrySync onEntry={requestAboutStop} />
      </Suspense>
      <div aria-hidden={isBlocking} className="contents" inert={isBlocking}>
        <DevPanels isArt={isArt} capturing={capture.enabled} artCameraStore={artCameraStore} />
        {sceneState === 'fallback' ? (
          <TerrainFallback />
        ) : sceneStarted ? (
          <Suspense fallback={null}>
            <SceneCanvas
              activeId={activeId}
              aboutStop={aboutStop}
              aboutProgressRef={aboutProgressRef}
              onAboutSelect={requestAboutStop}
              travelSelectedId={isTravel ? travelScene.selectedId : null}
              travelHoveredId={travelScene.hoveredId}
              onTravelSelect={(id) => router.push(`/travel/${id}`)}
              onTravelHover={travelScene.setHoveredId}
              onTravelCapture={travelScene.setCapturedId}
              travelGlobeOutlineRef={travelScene.globeOutline}
              backdrop={isArt && !artArriving ? backdrop : null}
              artActive={isArt}
              artCameraEditing={artCameraEditing && !artArriving && !capture.enabled}
              artCameraStore={artCameraStore}
              onArtCameraEditingChange={setArtCameraEditing}
              onPoseSettled={setSettledPose}
              introStarted={sceneState === 'ready'}
              onSceneError={handleSceneError}
              onSceneProgress={handleSceneProgress}
              onSceneReady={handleSceneReady}
              onLinkClick={toggleSection}
            />
          </Suspense>
        ) : null}

        {!isBlocking && !isArt ? (
          // Like the WebGL name and glyph rain, the HTML hero returns only once the camera is home.
          <HeroLayer
            isHidden={activeId !== null || settledPose !== null}
            useHtmlDesktopName={sceneState === 'fallback'}
          />
        ) : null}
        <Drawer
          activeId={activeId === 'art' || activeId === 'travel' ? null : activeId}
          aboutProgressRef={aboutProgressRef}
          aboutScrollRequest={aboutScrollRequest}
          onAboutStopChange={setAboutStop}
          articles={articles}
          onClose={closeSection}
        />
      </div>
      <div
        aria-hidden={artArriving || travelArriving || undefined}
        className={isTravel ? 'travel-content' : 'art-content'}
        inert={artArriving || travelArriving || (isArt && artCameraEditing && !capture.enabled)}
      >
        {children}
      </div>
      {process.env.NODE_ENV === 'development' && isArt && !artArriving && sceneState !== 'fallback'
        ? <CapturePanel />
        : null}
      {isRouted && sceneState === 'loading' ? (
        <p className={isTravel ? 'travel-scene-status' : 'art-scene-status'} role="status">
          Preparing the landscape…
        </p>
      ) : null}
      {isBlocking ? (
        <Preloader
          onContinueWithoutTerrain={enterTerrainFallback}
          progress={sceneProgress}
          reducedMotion={isReducedMotion}
          showBypass={showBypass}
          state={sceneState}
        />
      ) : null}
    </div>
  );
}
