'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type {SectionId} from '@/data/sections';
import type {ArticleSummary} from '@/lib/content/types';
import {TerrainBackground} from '@/components/scene/TerrainBackground';
import {Drawer} from './drawer/Drawer';
import {Hero} from './Hero';
import {HomepagePreloader} from './preloader/HomepagePreloader';
import { Leva } from 'leva';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {PRELOADER_CONFIG, type PreloaderVariant} from '@/config/preloader';
import {TerrainFallback} from '@/components/scene/TerrainFallback';

interface HomeProps {
  articles: readonly ArticleSummary[];
}

type SceneState = 'loading' | 'exiting' | 'ready' | 'fallback';

export function Home({articles}: HomeProps) {
  const [activeId, setActiveId] = useState<SectionId | null>(null);
  const [preloaderVariant, setPreloaderVariant] = useState<PreloaderVariant>(
    PRELOADER_CONFIG.defaultVariant,
  );
  const [sceneState, setSceneState] = useState<SceneState>('loading');
  const [showBypass, setShowBypass] = useState(false);
  const sceneResolvedRef = useRef(false);
  const previewRef = useRef(
    process.env.NODE_ENV === 'development'
      && typeof window !== 'undefined'
      && new URLSearchParams(window.location.hash.slice(1)).get('preview') === '1',
  );
  const stallRef = useRef(
    process.env.NODE_ENV === 'development'
      && typeof window !== 'undefined'
      && new URLSearchParams(window.location.hash.slice(1)).get('stall') === '1',
  );
  const previewStartedAtRef = useRef<number | null>(
    typeof window === 'undefined' ? null : window.performance.now(),
  );
  const readyTimerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const isReducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    previewStartedAtRef.current = window.performance.now();
    if (process.env.NODE_ENV !== 'development') return;

    const applyDevelopmentOptions = () => {
      const parameters = new URLSearchParams(window.location.hash.slice(1));
      const requestedVariant = parameters.get('preloader');
      if (requestedVariant === 'contour' || requestedVariant === 'type') {
        setPreloaderVariant(requestedVariant);
      }
      previewRef.current = parameters.get('preview') === '1';
      stallRef.current = parameters.get('stall') === '1';
    };
    applyDevelopmentOptions();
    window.addEventListener('hashchange', applyDevelopmentOptions);
    return () => window.removeEventListener('hashchange', applyDevelopmentOptions);
  }, []);

  useEffect(() => () => {
    if (readyTimerRef.current !== null) window.clearTimeout(readyTimerRef.current);
    if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current);
  }, []);

  useEffect(() => {
    if (sceneState !== 'loading') return;
    const timer = window.setTimeout(
      () => setShowBypass(true),
      PRELOADER_CONFIG.bypassDelayMs,
    );
    return () => window.clearTimeout(timer);
  }, [sceneState]);

  const finishSceneTransition = useCallback(() => {
    setShowBypass(false);
    setSceneState('exiting');
    const duration = isReducedMotion
      ? PRELOADER_CONFIG.reducedMotionExitDurationMs
      : PRELOADER_CONFIG.exitDurationMs;
    exitTimerRef.current = window.setTimeout(() => {
      setSceneState('ready');
    }, duration);
  }, [isReducedMotion]);

  const handleSceneReady = useCallback(() => {
    if (sceneResolvedRef.current) return;
    if (process.env.NODE_ENV === 'development' && stallRef.current) return;
    sceneResolvedRef.current = true;
    const previewStartedAt = previewStartedAtRef.current ?? window.performance.now();
    const previewRemaining = previewRef.current
      ? Math.max(
        0,
        PRELOADER_CONFIG.previewDurationMs
          - (window.performance.now() - previewStartedAt),
      )
      : 0;
    if (previewRemaining === 0) {
      finishSceneTransition();
      return;
    }
    readyTimerRef.current = window.setTimeout(finishSceneTransition, previewRemaining);
  }, [finishSceneTransition]);

  const enterTerrainFallback = useCallback(() => {
    sceneResolvedRef.current = true;
    if (readyTimerRef.current !== null) window.clearTimeout(readyTimerRef.current);
    if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current);
    setShowBypass(false);
    setSceneState('fallback');
  }, []);

  const handleSceneError = useCallback((error: Error) => {
    console.error('Homepage terrain failed to initialize.', error);
    enterTerrainFallback();
  }, [enterTerrainFallback]);

  function toggleSection(id: SectionId) {
    setActiveId((currentId) => currentId === id ? null : id);
  }

  const isBlocking = sceneState === 'loading' || sceneState === 'exiting';

  return (
    <main
      className="relative h-svh w-full overflow-hidden bg-background text-foreground"
      aria-busy={isBlocking}
    >
      <div aria-hidden={isBlocking} className="contents" inert={isBlocking}>
        <Leva
          collapsed={true}
          hidden={process.env.NODE_ENV !== 'development'}
          theme={{
            sizes: {
              rootWidth: '400px',
            },
          }}
        />
        {sceneState === 'fallback' ? (
          <TerrainFallback />
        ) : (
          <TerrainBackground
            activeId={activeId}
            onSceneError={handleSceneError}
            onSceneReady={handleSceneReady}
            onStreamClick={toggleSection}
          />
        )}

        <div className="pointer-events-none relative -mt-[100svh] h-svh md:hidden">
          <Hero
            isHidden={activeId !== null}
            useHtmlDesktopName={sceneState === 'fallback'}
          />
        </div>

        <div className="hidden md:block">
          <Hero
            isHidden={activeId !== null}
            useHtmlDesktopName={sceneState === 'fallback'}
          />
        </div>
        <Drawer
          activeId={activeId}
          articles={articles}
          onClose={() => setActiveId(null)}
        />
      </div>
      {isBlocking ? (
        <HomepagePreloader
          onContinueWithoutTerrain={enterTerrainFallback}
          reducedMotion={isReducedMotion}
          showBypass={showBypass}
          state={sceneState}
          variant={preloaderVariant}
        />
      ) : null}
    </main>
  );
}
