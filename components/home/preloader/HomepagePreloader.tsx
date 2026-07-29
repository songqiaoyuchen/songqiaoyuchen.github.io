'use client';

import {useEffect, useRef, useState, type CSSProperties} from 'react';
import type {PreloaderVariant} from '@/config/preloader';
import {PRELOADER_CONFIG} from '@/config/preloader';

export type PreloaderState = 'loading' | 'exiting';

type HomepagePreloaderProps = {
  onContinueWithoutTerrain: () => void;
  reducedMotion: boolean;
  showBypass: boolean;
  state: PreloaderState;
  variant: PreloaderVariant;
};

const CONTOUR_PATHS = [
  'M-80 720 C120 560 270 760 460 620 C640 488 760 704 946 564 C1116 436 1274 546 1530 386',
  'M-100 792 C104 622 306 824 494 676 C672 536 818 760 1018 610 C1200 474 1352 570 1548 472',
  'M-120 862 C76 706 314 888 540 738 C720 618 870 814 1080 688 C1268 576 1414 648 1560 560',
  'M140 592 C258 486 340 536 406 472 C480 400 552 420 626 354 C706 282 792 310 882 242',
  'M878 824 C994 738 1076 774 1154 700 C1242 616 1334 648 1468 548',
] as const;

function ContourSurvey() {
  return (
    <div aria-hidden="true" className="preloader-contour-variant">
      <svg
        className="preloader-contour-map"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1440 900"
      >
        {CONTOUR_PATHS.map((path, index) => (
          <path
            className={index === 1 ? 'preloader-contour-active' : undefined}
            d={path}
            key={path}
            pathLength="1"
          />
        ))}
      </svg>
      <div className="preloader-survey-label">
        <span>Terrain survey</span>
        <span aria-hidden="true" className="preloader-survey-index">SQYC—01</span>
      </div>
      <span className="preloader-survey-point" />
    </div>
  );
}

function TypeBuild() {
  return (
    <div aria-hidden="true" className="preloader-type-variant">
      <div className="preloader-type-mark">
        {'SQYC'.split('').map((letter, index) => (
          <span key={letter} style={{'--glyph-index': index} as CSSProperties}>
            {letter}
          </span>
        ))}
      </div>
      <div className="preloader-type-rule"><span /></div>
      <p>Charting terrain</p>
    </div>
  );
}

export function HomepagePreloader({
  onContinueWithoutTerrain,
  reducedMotion,
  showBypass,
  state,
  variant,
}: HomepagePreloaderProps) {
  const [showVisual, setShowVisual] = useState(false);
  const bypassRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setShowVisual(true),
      reducedMotion ? 0 : PRELOADER_CONFIG.visualDelayMs,
    );
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  useEffect(() => {
    const navigation = document.querySelector<HTMLElement>('nav[aria-label="Site navigation"]');
    const previousAriaHidden = navigation?.getAttribute('aria-hidden');
    navigation?.setAttribute('inert', '');
    navigation?.setAttribute('aria-hidden', 'true');
    if (navigation?.contains(document.activeElement)) {
      (document.activeElement as HTMLElement | null)?.blur();
    }
    document.documentElement.dataset.homeLoading = 'true';

    return () => {
      navigation?.removeAttribute('inert');
      if (previousAriaHidden === null) navigation?.removeAttribute('aria-hidden');
      else if (previousAriaHidden !== undefined) {
        navigation?.setAttribute('aria-hidden', previousAriaHidden);
      }
      delete document.documentElement.dataset.homeLoading;
    };
  }, []);

  useEffect(() => {
    if (showBypass) bypassRef.current?.focus();
  }, [showBypass]);

  return (
    <div
      aria-busy={state === 'loading'}
      className="homepage-preloader"
      data-reduced-motion={reducedMotion || undefined}
      data-state={state}
      data-variant={variant}
      data-visual={showVisual || undefined}
    >
      <p aria-live="polite" className="sr-only" role="status">
        {showBypass
          ? 'The homepage terrain is taking longer than expected.'
          : 'Loading homepage terrain.'}
      </p>
      {variant === 'contour' ? <ContourSurvey /> : <TypeBuild />}
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
