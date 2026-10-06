// Scene loading state machine for SceneShell: loading -> exiting (preloader dissolve) -> ready, or fallback.
// Also owns the preloader progress, the "enter without terrain" bypass and dev #preview/#stall options.
'use client';

import {startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {PRELOADER_CONFIG} from '@/config/preloader';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {waitForHealthyFrames} from '@/lib/scene/frameBudget';

export type SceneState = 'loading' | 'exiting' | 'ready' | 'fallback';

const readDevelopmentOption = (name: 'preview' | 'stall') =>
  process.env.NODE_ENV === 'development' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.hash.slice(1)).get(name) === '1';

/** On Art the scene settles straight to ready; Home plays the preloader exit first. */
export function useSceneLoading(isArt: boolean) {
  const [sceneProgress, setSceneProgress] = useState(0);
  const [sceneStarted, setSceneStarted] = useState(false);
  const [sceneState, setSceneState] = useState<SceneState>('loading');
  const [showBypass, setShowBypass] = useState(false);
  const sceneResolvedRef = useRef(false);
  // Development: #preview=1 holds the preloader for a minimum time, #stall=1 never resolves it.
  const previewRef = useRef(readDevelopmentOption('preview'));
  const stallRef = useRef(readDevelopmentOption('stall'));
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
      previewRef.current = parameters.get('preview') === '1';
      stallRef.current = parameters.get('stall') === '1';
    };
    applyDevelopmentOptions();
    window.addEventListener('hashchange', applyDevelopmentOptions);
    return () => window.removeEventListener('hashchange', applyDevelopmentOptions);
  }, []);

  // Mount the canvas only once the page has frame budget to spare.
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

  return {
    sceneState,
    sceneStarted,
    sceneProgress,
    showBypass,
    isReducedMotion,
    handleSceneReady,
    handleSceneProgress,
    handleSceneError,
    enterTerrainFallback,
  };
}
