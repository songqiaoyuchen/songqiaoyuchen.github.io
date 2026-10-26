// Persistent shell for the Home, About, Blog, Projects, Art and Places routes: one WebGL scene, the homepage
// hero/drawer/preloader, and the Art or Places route content layered on top.
// Kept mounted across those routes so the canvas survives.
'use client';

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {useCreateStore} from 'leva';
import {useArtBackdrop, useArtCapture} from '@/components/art/ArtSceneContext';
import {CapturePanel} from '@/components/art/capture/CapturePanel';
import type {AboutScrollRequest} from '@/components/home/drawer/about/useTimelineProgress';
import {Drawer, preloadDrawerPanels} from '@/components/home/drawer/Drawer';
import {HeroLayer} from '@/components/home/hero/HeroLayer';
import {Preloader} from '@/components/home/preloader/Preloader';
import {HOME_OVERVIEW_EVENT, SECTION_NAVIGATE_EVENT} from '@/components/site/Nav';
import {usePlacesSceneActions} from '@/components/places/PlacesSceneContext';
import {HERO_NAME_RENDERER} from '@/config/hero';
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

/** The nav destinations inside this shell, and the section each one means to the camera. */
const SHELL_DESTINATIONS: Record<string, SectionId | null> = {
  '/': null,
  '/about': 'about',
  '/artworks': 'art',
  '/blog': 'blog',
  '/projects': 'projects',
  '/places': 'places',
};
/** Drawer routes: the drawer section each path opens beside the scene. */
const DRAWER_ROUTES: Record<string, SectionId> = {
  '/about': 'about',
  '/blog': 'blog',
  '/projects': 'projects',
};
/** How long a routed section's content takes to fade out before its route changes (ArtSection.css, Places.css). */
const SECTION_LEAVE_MS = 400;

export function SceneShell({articles, children}: SceneShellProps) {
  // The static export (trailingSlash) reports `/blog/`; route tables are keyed without it.
  const pathname = usePathname().replace(/(.)\/+$/, '$1');
  const router = useRouter();
  const isArt = pathname.startsWith('/artworks');
  const drawerRoute: SectionId | null = DRAWER_ROUTES[pathname] ?? null;
  const isAbout = drawerRoute === 'about';
  const isPlaces = pathname.startsWith('/places');
  const {backdrop} = useArtBackdrop();
  const {capture} = useArtCapture();
  // Only the stable setters: the selected, hovered and captured locations reach the globe and the camera through the
  // canvas's context bridge, so their changes leave the shell (and the canvas tree) alone.
  const placesActions = usePlacesSceneActions();
  // Every section is a route. The one clicked is also held here for the moment between its link click and its
  // route arriving, so the camera and drawer start at once.
  const [previewId, setPreviewId] = useState<SectionId | null>(null);
  // Leaving Art or Places by the nav: the content fades and the camera sets off before the route changes.
  const [leaving, setLeaving] = useState<{href: string; id: SectionId | null; from: string} | null>(null);
  // The route has moved on (by the shell's own push or by history): the leaving state has done its job.
  if (leaving !== null && leaving.from !== pathname) setLeaving(null);
  const activeId: SectionId | null = leaving ? leaving.id
    : isArt ? 'art' : isPlaces ? 'places' : drawerRoute ?? previewId;
  // About: the timeline stop the drawer has settled on, and checkpoint clicks asking it to scroll.
  const [aboutStop, setAboutStop] = useState(-1);
  const [aboutScrollRequest, setAboutScrollRequest] = useState<AboutScrollRequest | null>(null);
  // The drawer's reading head in stops, read by the terrain path every frame.
  const aboutProgressRef = useRef(0);
  const [artCameraEditing, setArtCameraEditing] = useState(false);
  const artCameraStore = useCreateStore();
  const [settledPose, setSettledPose] = useState<SectionId | null | undefined>(
    isArt ? 'art' : isPlaces ? 'places' : null,
  );
  // First arrival on the overview: the preloader exits by the intro (the ink), completed when the ink has lifted (a
  // direct section entry or a drawer route opens at its own pose and the cover fades). The terrain's wave sets off
  // as the cover lifts.
  const [introWanted] = useState(activeId === null);
  const [waveStarted, setWaveStarted] = useState(false);
  const startWave = useCallback(() => setWaveStarted(true), []);
  const {
    sceneState,
    sceneStarted,
    sceneProgress,
    showBypass,
    isReducedMotion,
    intro,
    completeExit,
    handleSceneReady,
    handleSceneProgress,
    handleSceneError,
    enterTerrainFallback,
  } = useSceneLoading(isArt || isPlaces, introWanted);

  // A routed section dismisses the old homepage preview, including entry via Nav.
  // Adjust before rendering so Home always returns to the landscape overview.
  if ((isArt || isPlaces || drawerRoute !== null) && previewId !== null) setPreviewId(null);
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

  // The drawer panels' chunks, fetched at idle once the scene is ready rather than on the first open.
  useEffect(() => {
    if (sceneState !== 'ready') return;
    if (typeof window.requestIdleCallback !== 'function') {
      preloadDrawerPanels();
      return;
    }
    const handle = window.requestIdleCallback(preloadDrawerPanels, {timeout: 4000});
    return () => window.cancelIdleCallback(handle);
  }, [sceneState]);

  // SQYC on Home closes the open section (Nav cannot navigate to the page it is on).
  useEffect(() => {
    const returnToOverview = () => setPreviewId(null);
    window.addEventListener(HOME_OVERVIEW_EVENT, returnToOverview);
    return () => window.removeEventListener(HOME_OVERVIEW_EVENT, returnToOverview);
  }, []);

  // A nav click away from Art or Places: cancel the link, fade the content out while the camera starts its
  // journey, then push the route once the content is invisible (the layout swap and scroll reset go unseen).
  // Back/Forward cannot be held, so those keep the instant swap; the camera journey is the same either way.
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRouted = isArt || isPlaces;
  useEffect(() => {
    if (!isRouted) return;
    const leave = (event: Event) => {
      const href = (event as CustomEvent<{href: string}>).detail?.href;
      if (href === undefined || !(href in SHELL_DESTINATIONS)) return;
      event.preventDefault();
      setLeaving({href, id: SHELL_DESTINATIONS[href], from: pathname});
      if (leaveTimer.current !== null) clearTimeout(leaveTimer.current);
      leaveTimer.current = setTimeout(() => {
        leaveTimer.current = null;
        router.push(href);
      }, SECTION_LEAVE_MS);
    };
    window.addEventListener(SECTION_NAVIGATE_EVENT, leave);
    return () => window.removeEventListener(SECTION_NAVIGATE_EVENT, leave);
  }, [isRouted, pathname, router]);
  // History moving the route first makes the pending push stale.
  useEffect(() => () => {
    if (leaveTimer.current !== null) clearTimeout(leaveTimer.current);
    leaveTimer.current = null;
  }, [pathname]);

  // Stable callbacks: the canvas is memoized, so shell state changes (a pose settling, a captured location) do not
  // re-render the whole WebGL tree mid-journey.
  const requestAboutStop = useCallback((stop: number) => {
    setAboutScrollRequest((current) => ({stop, key: (current?.key ?? 0) + 1}));
  }, []);

  // Read through a ref: the callbacks keep their identity across routes, so the memoized canvas is left alone
  // when a drawer route lands.
  const drawerRouteRef = useRef(drawerRoute);
  useLayoutEffect(() => {
    drawerRouteRef.current = drawerRoute;
  }, [drawerRoute]);
  const toggleSection = useCallback((id: SectionId) => {
    if (id === 'art') {
      // Start from the live camera pose, even while the route is being fetched.
      setPreviewId('art');
      router.push('/artworks');
      return;
    }
    if (id === 'places') {
      setPreviewId('places');
      router.push('/places');
      return;
    }
    // About, Blog and Projects open as drawer routes; their scene link again closes the drawer.
    if (drawerRouteRef.current === id) {
      router.push('/');
    } else {
      setPreviewId(id);
      router.push(`/${id}`);
    }
  }, [router]);

  const closeSection = useCallback(() => {
    if (drawerRouteRef.current !== null) router.push('/');
    else setPreviewId(null);
  }, [router]);

  const openLocation = useCallback((id: string) => router.push(`/places/${id}`), [router]);

  const isBlocking = !isRouted && (sceneState === 'loading' || sceneState === 'exiting');
  // Art and Places content stays hidden until the camera has arrived at the section's pose (and, on the way
  // out, fades under the leaving state rather than snapping off as the camera sets off).
  const isLeaving = leaving !== null;
  const artArriving = isArt && !isLeaving && settledPose !== 'art' && sceneState !== 'fallback';
  // Places gates its content only on the way in from outside: once the camera has settled on a Places pose, the
  // journeys between the overview and a location are Places's own, choreographed by PlacesSection (the old view
  // fades out, the new one rises as the camera lands), not hidden until the camera settles again.
  const [placesEntered, setPlacesEntered] = useState(settledPose === 'places');
  if (isPlaces && settledPose === 'places' && !placesEntered) setPlacesEntered(true);
  if (!isPlaces && placesEntered) setPlacesEntered(false);
  const placesArriving = isPlaces && !isLeaving && !placesEntered && sceneState !== 'fallback';

  return (
    <div
      className={`relative min-h-svh w-full bg-background text-foreground
        ${isArt ? 'art-environment' : isPlaces ? 'places-environment h-svh overflow-hidden' : 'h-svh overflow-hidden'}`}
      aria-busy={isBlocking}
      data-art-arriving={artArriving}
      data-places-arriving={placesArriving}
      data-leaving={isLeaving}
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
              onPlacesSelect={openLocation}
              onPlacesHover={placesActions.setHoveredId}
              onPlacesCapture={placesActions.setCapturedId}
              placesGlobeOutlineRef={placesActions.globeOutline}
              placesGlobeFrontRef={placesActions.globeFront}
              backdrop={isArt && !artArriving && !isLeaving ? backdrop : null}
              artActive={isArt}
              artCameraEditing={artCameraEditing && !artArriving && !capture.enabled}
              artCameraStore={artCameraStore}
              onArtCameraEditingChange={setArtCameraEditing}
              onPoseSettled={setSettledPose}
              revealStarted={waveStarted || sceneState === 'ready'}
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
            useHtmlName={sceneState === 'fallback' || HERO_NAME_RENDERER === 'html'}
          />
        ) : null}
        <Drawer
          activeId={activeId === 'art' || activeId === 'places' ? null : activeId}
          aboutProgressRef={aboutProgressRef}
          aboutScrollRequest={aboutScrollRequest}
          onAboutStopChange={setAboutStop}
          articles={articles}
          onClose={closeSection}
        />
      </div>
      <div
        aria-hidden={artArriving || placesArriving || isLeaving || undefined}
        className={isPlaces ? 'places-content' : 'art-content'}
        inert={artArriving || placesArriving || isLeaving || (isArt && artCameraEditing && !capture.enabled)}
      >
        {children}
      </div>
      {process.env.NODE_ENV === 'development' && isArt && !artArriving && sceneState !== 'fallback'
        ? <CapturePanel />
        : null}
      {isRouted && sceneState === 'loading' ? (
        <p className={isPlaces ? 'places-scene-status' : 'art-scene-status'} role="status">
          Preparing the landscape…
        </p>
      ) : null}
      {isBlocking ? (
        <Preloader
          intro={intro}
          onContinueWithoutTerrain={enterTerrainFallback}
          onIntroLift={startWave}
          onIntroDone={completeExit}
          progress={sceneProgress}
          reducedMotion={isReducedMotion}
          showBypass={showBypass}
          state={sceneState}
        />
      ) : null}
    </div>
  );
}
