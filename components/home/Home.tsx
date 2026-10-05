'use client';

import {
  lazy,
  startTransition,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {useArtScene} from '@/components/artworks/ArtSceneContext';
import {ArtCapturePanel} from '@/components/artworks/ArtCapturePanel';
import type {SectionId} from '@/config/navigation/linkStreams';
import type {ArticleSummary} from '@/lib/content/types';
import {Drawer} from './drawer/Drawer';
import {Hero} from './Hero';
import {HomepagePreloader} from './preloader/HomepagePreloader';
import {Leva, LevaPanel, useCreateStore} from 'leva';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {PRELOADER_CONFIG} from '@/config/preloader';
import {TerrainFallback} from '@/components/scene/TerrainFallback';
import {waitForHealthyFrames} from '@/lib/performance/frameBudget';

const TerrainBackground = lazy(() =>
  import('@/components/scene/TerrainBackground').then(({TerrainBackground: Background}) => ({
    default: Background,
  })),
);

interface HomeProps {
  articles: readonly ArticleSummary[];
  children?: ReactNode;
}

type SceneState = 'loading' | 'exiting' | 'ready' | 'fallback';

export function Home({articles, children}: HomeProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isArt = pathname.startsWith('/artworks');
  const {medium, capture} = useArtScene();
  const [activeId, setActiveId] = useState<SectionId | null>(null);
  const [artCameraEditing, setArtCameraEditing] = useState(false);
  const artCameraStore = useCreateStore();
  const [settledPose, setSettledPose] = useState<SectionId | null | undefined>(isArt ? 'art' : null);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [sceneStarted, setSceneStarted] = useState(false);
  const [sceneState, setSceneState] = useState<SceneState>('loading');
  const [showBypass, setShowBypass] = useState(false);
  const sceneResolvedRef = useRef(false);
  const previewRef = useRef(
    process.env.NODE_ENV === 'development' &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.hash.slice(1)).get('preview') === '1',
  );
  const stallRef = useRef(
    process.env.NODE_ENV === 'development' &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.hash.slice(1)).get('stall') === '1',
  );
  const previewStartedAtRef = useRef<number | null>(
    typeof window === 'undefined' ? null : window.performance.now(),
  );
  const readyTimerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const isReducedMotion = useReducedMotion();

  // An Art visit dismisses the old homepage preview, including entry via Nav.
  // Adjust before rendering so Home always returns to the landscape overview.
  if (isArt && activeId !== null) setActiveId(null);

  useLayoutEffect(() => {
    previewStartedAtRef.current = window.performance.now();
    if (process.env.NODE_ENV !== 'development') return;

    const applyDevelopmentOptions = () => {
      const parameters = new URLSearchParams(window.location.hash.slice(1));
      previewRef.current = parameters.get('preview') === '1';
      stallRef.current = parameters.get('stall') === '1';
    };
    applyDevelopmentOptions();
    window.addEventListener('hashchange', applyDevelopmentOptions);
    return () => window.removeEventListener('hashchange', applyDevelopmentOptions);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void waitForHealthyFrames().then(() => {
      if (!cancelled) {
        startTransition(() => setSceneStarted(true));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      if (readyTimerRef.current !== null) window.clearTimeout(readyTimerRef.current);
      if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (sceneState !== 'loading') return;
    const timer = window.setTimeout(() => setShowBypass(true), PRELOADER_CONFIG.bypassDelayMs);
    return () => window.clearTimeout(timer);
  }, [sceneState]);

  const finishSceneTransition = useCallback(() => {
    setShowBypass(false);
    if (isArt) {
      setSceneState('ready');
      return;
    }
    setSceneState('exiting');
    const duration = isReducedMotion
      ? PRELOADER_CONFIG.reducedMotionExitDurationMs
      : PRELOADER_CONFIG.exitDurationMs;
    exitTimerRef.current = window.setTimeout(() => {
      setSceneState('ready');
    }, duration);
  }, [isArt, isReducedMotion]);

  const handleSceneReady = useCallback(() => {
    if (sceneResolvedRef.current) return;
    if (process.env.NODE_ENV === 'development' && stallRef.current) return;
    sceneResolvedRef.current = true;
    setSceneProgress(1);
    const previewStartedAt = previewStartedAtRef.current ?? window.performance.now();
    const previewRemaining = previewRef.current
      ? Math.max(0, PRELOADER_CONFIG.previewDurationMs - (window.performance.now() - previewStartedAt))
      : 0;
    if (previewRemaining === 0) {
      finishSceneTransition();
      return;
    }
    readyTimerRef.current = window.setTimeout(finishSceneTransition, previewRemaining);
  }, [finishSceneTransition]);

  const handleSceneProgress = useCallback((progress: number) => {
    const clampedProgress = Math.min(1, Math.max(0, progress));
    setSceneProgress((currentProgress) => Math.max(currentProgress, clampedProgress));
  }, []);

  const enterTerrainFallback = useCallback(() => {
    sceneResolvedRef.current = true;
    if (readyTimerRef.current !== null) window.clearTimeout(readyTimerRef.current);
    if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current);
    setShowBypass(false);
    setSceneState('fallback');
    void import('@/lib/terrain/assets').then(({disposeTerrainPipeline}) => {
      disposeTerrainPipeline();
    });
  }, []);

  const handleSceneError = useCallback(
    (error: Error) => {
      console.error('Homepage terrain failed to initialize.', error);
      enterTerrainFallback();
    },
    [enterTerrainFallback],
  );

  function toggleSection(id: SectionId) {
    if (id === 'art') {
      // Start from the live camera pose, even while the route is being fetched.
      setActiveId('art');
      router.push('/artworks');
      return;
    }
    setActiveId((currentId) => (currentId === id ? null : id));
  }

  const isBlocking = !isArt && (sceneState === 'loading' || sceneState === 'exiting');
  const artArriving = isArt && settledPose !== 'art' && sceneState !== 'fallback';

  return (
    <div
      className={`relative min-h-svh w-full bg-background text-foreground
        ${isArt ? 'art-environment' : 'h-svh overflow-hidden'}`}
      aria-busy={isBlocking}
      data-art-arriving={artArriving}
      data-camera-editing={isArt && artCameraEditing}
    >
      <div aria-hidden={isBlocking} className="contents" inert={isBlocking}>
        <Leva
          collapsed={true}
          hidden={process.env.NODE_ENV !== 'development' || isArt}
          theme={{
            sizes: {
              rootWidth: 'min(400px, calc(100vw - 20px))',
            },
          }}
        />
        {process.env.NODE_ENV === 'development' && isArt && !capture.enabled && (
          <LevaPanel store={artCameraStore} titleBar={{title: 'Art Camera', filter: false}}
            theme={{sizes: {rootWidth: 'min(360px, calc(100vw - 20px))'}}} />
        )}
        {sceneState === 'fallback' ? (
          <TerrainFallback />
        ) : sceneStarted ? (
          <Suspense fallback={null}>
            <TerrainBackground
              activeId={isArt ? 'art' : activeId}
              artMedium={isArt && !artArriving ? medium : null}
              artActive={isArt}
              artCameraEditing={artCameraEditing && !artArriving && !capture.enabled}
              artCameraStore={artCameraStore}
              onArtCameraEditingChange={setArtCameraEditing}
              onPoseSettled={setSettledPose}
              introStarted={sceneState === 'ready'}
              onSceneError={handleSceneError}
              onSceneProgress={handleSceneProgress}
              onSceneReady={handleSceneReady}
              onStreamClick={toggleSection}
            />
          </Suspense>
        ) : null}

        {!isBlocking && !isArt ? (
          <main>
            <div className="pointer-events-none relative -mt-[100svh] h-svh md:hidden">
              <Hero isHidden={activeId !== null} useHtmlDesktopName={sceneState === 'fallback'} />
            </div>

            <div className="hidden md:block">
              <Hero isHidden={activeId !== null} useHtmlDesktopName={sceneState === 'fallback'} />
            </div>
          </main>
        ) : null}
        <Drawer
          activeId={isArt || activeId === 'art' ? null : activeId}
          articles={articles}
          onClose={() => setActiveId(null)}
        />
      </div>
      <div className="art-content" inert={artArriving || (isArt && artCameraEditing && !capture.enabled)}
        aria-hidden={artArriving || undefined}>
        {children}
      </div>
      {isArt && !artArriving && sceneState !== 'fallback' ? <ArtCapturePanel /> : null}
      {isArt && sceneState === 'loading' ? (
        <p className="art-scene-status" role="status">
          Preparing the landscape…
        </p>
      ) : null}
      {isBlocking ? (
        <HomepagePreloader
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
