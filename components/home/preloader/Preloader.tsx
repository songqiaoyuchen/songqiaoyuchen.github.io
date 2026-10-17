// Homepage preloader: the contour mark with its spiralling highlight and, beneath it, the loading stage under way
// (PRELOADER_CONFIG.stages: the terrain worker's fetches, then the shaders' first frames). On first arrival at the
// overview the exit is the intro (IntroInk): once the scene is ready and held a moment, the cover takes over the
// rings, grows the contour map out of them and widens the lines until the scene shows through; the preloader goes
// when the cover has lifted. Opening on a section, with reduced motion or without WebGL2 it simply fades. Offers
// "Enter without terrain" when loading is slow (styles in Preloader.css).
'use client';

import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {useIntroControls} from '@/components/scene/controls/useIntroControls';
import {PRELOADER_CONFIG} from '@/config/preloader';
import {planIntroMap, type IntroMapLayout, type IntroMapPlan} from '@/lib/intro/inkPlan';
import {IntroInk} from './IntroInk';
import {MountainContour} from './MountainContour';
import {useNavLock} from './useNavLock';

export type PreloaderState = 'loading' | 'exiting';

type PreloaderProps = {
  /** The exit is the intro (the cover); otherwise a fade. */
  intro: boolean;
  onContinueWithoutTerrain: () => void;
  /** The cover is lifting: the terrain's wave may set off. */
  onIntroLift: () => void;
  /** The cover has lifted: the preloader may go. */
  onIntroDone: () => void;
  progress: number;
  reducedMotion: boolean;
  showBypass: boolean;
  state: PreloaderState;
};

/** The mark's stroke width, CSS px (Preloader.css). */
const MARK_LINE_WIDTH = 1.25;

export function Preloader({
  intro,
  onContinueWithoutTerrain,
  onIntroLift,
  onIntroDone,
  progress,
  reducedMotion,
  showBypass,
  state,
}: PreloaderProps) {
  const bypassRef = useRef<HTMLButtonElement>(null);
  const lockupRef = useRef<HTMLDivElement>(null);
  const introSettings = useIntroControls();
  const clamped = Math.min(1, Math.max(0, progress));
  const stagesDone = PRELOADER_CONFIG.stages.filter((stage) => clamped >= stage.progress).length;
  const [inkPlaying, setInkPlaying] = useState(false);
  const [inkStarted, setInkStarted] = useState(false);
  const [layout, setLayout] = useState<IntroMapLayout | null>(null);
  const planRef = useRef<IntroMapPlan | null>(null);

  useNavLock();

  useEffect(() => {
    if (showBypass) bypassRef.current?.focus();
  }, [showBypass]);

  // The intro sets off once the scene is ready and the mark has held a moment.
  useEffect(() => {
    if (!intro || state !== 'exiting' || inkPlaying) return;
    const timer = window.setTimeout(() => setInkPlaying(true), PRELOADER_CONFIG.readyHoldMs);
    return () => window.clearTimeout(timer);
  }, [inkPlaying, intro, state]);

  // Where the mark stands on screen: the cover's first strokes are its rings, and the map is laid out around it.
  const {lineSpacing, mapRelief} = introSettings;
  useLayoutEffect(() => {
    if (!intro) return;
    const measure = () => {
      const icon = lockupRef.current?.querySelector('svg');
      if (!icon) return;
      const rect = icon.getBoundingClientRect();
      setLayout({
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
        mark: {left: rect.left, top: rect.top, width: rect.width, height: rect.height},
        lineSpacing,
        lineWidth: MARK_LINE_WIDTH,
        wobble: mapRelief,
      });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [intro, lineSpacing, mapRelief]);

  // The map's field is the costly part: laid out at idle while the terrain loads, for the viewport as it is.
  useEffect(() => {
    if (!layout || inkPlaying) return;
    planRef.current = null;
    const plan = () => { planRef.current = planIntroMap(layout); };
    if (typeof window.requestIdleCallback !== 'function') {
      const timer = window.setTimeout(plan, 0);
      return () => window.clearTimeout(timer);
    }
    const handle = window.requestIdleCallback(plan, {timeout: 2000});
    return () => window.cancelIdleCallback(handle);
  }, [inkPlaying, layout]);

  const label = state === 'exiting' || stagesDone >= PRELOADER_CONFIG.stages.length
    ? PRELOADER_CONFIG.readyLabel
    : PRELOADER_CONFIG.stages[stagesDone].label;

  return (
    <div
      aria-busy={state === 'loading'}
      className="homepage-preloader"
      data-ink={inkStarted || undefined}
      data-intro={intro || undefined}
      data-reduced-motion={reducedMotion || undefined}
      data-state={state}
    >
      <p aria-live="polite" className="sr-only" role="status">
        {showBypass
          ? 'The homepage terrain is taking longer than expected.'
          : 'Loading homepage terrain.'}
      </p>
      {inkPlaying && layout ? (
        <IntroInk
          layout={layout}
          onLift={onIntroLift}
          onDone={onIntroDone}
          onStart={() => setInkStarted(true)}
          getPlan={() => planRef.current}
          settings={introSettings}
        />
      ) : null}
      <div aria-hidden="true" className="preloader-mountain-variant">
        <div className="preloader-mountain-lockup" ref={lockupRef}>
          <MountainContour />
          <p className="preloader-stage">{label}</p>
        </div>
      </div>
      {showBypass ? (
        <div className="preloader-bypass">
          <p>Terrain is taking longer than expected.</p>
          <button
            onClick={onContinueWithoutTerrain}
            ref={bypassRef}
            type="button"
          >
            Enter without terrain
          </button>
        </div>
      ) : null}
    </div>
  );
}
