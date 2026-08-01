'use client';

import {useEffect, useRef} from 'react';
import {PRELOADER_CONFIG} from '@/config/preloader';
import {CountUp} from './CountUp';

export type PreloaderState = 'loading' | 'exiting';

type HomepagePreloaderProps = {
  onContinueWithoutTerrain: () => void;
  progress: number;
  reducedMotion: boolean;
  showBypass: boolean;
  state: PreloaderState;
};

const CONTOUR_PATHS = [
  'M313.21762 293.91324l18.95641-20.0001 30.43479-6.95652 26.95653 4.34783 ' +
    '28.69566-.86957 20.86957-2.6087 20.86957 10.43479 7.82609 29.56523-7.82609 ' +
    '25.2174-20.86957 20.00001-6.95652 28.69566-14.78261 14.78261-14.78261 ' +
    '4.34783-18.26088-8.69566-12.17392-18.26088-15.65218-22.6087-28.69566-10.43479 ' +
    '-14.78261-24.34783.17403-22.60861Z',
  'M335.82632 303.47846l15.47815 27.826 22.6087 4.34783 11.30435 14.78261 ' +
    '6.95652 20.86957 12.17392 13.04348 11.30435.86957 13.04348-19.13044 ' +
    '6.08696-24.34783 11.30435-19.13044 9.56522-18.26088-6.95652-20.86957 ' +
    '-11.30435-5.21739-28.69566 3.47826-14.78261.86957-27.8261-2.6087 ' +
    '-20.86957 5.21739-9.39119 18.26097Z',
  'M365.21752 324.34794l25.2174 5.21739 12.17392 13.91305 4.34783 24.34783 ' +
    '6.08696 1.73913 6.95652-25.2174 13.91305-17.39131 9.56522-18.26088 ' +
    '-6.08696-15.65218-16.52175-3.47826-17.39131 6.95652-20.86957-1.73913 ' +
    '-20.00001-1.73913-5.65218 18.26088 8.26087 13.04348Z',
  'M378.43503 307.82629l7.65206 7.826 14.78261 3.47826 11.30435 19.13044 ' +
    '11.30435-14.78261 6.08696-13.04348-7.82609-6.95652-13.91305 4.34783 ' +
    '-22.6087-5.21739-6.7825 5.21749Z',
  'M408.5609 319.40267l4.78261-7.8261 4.78261 7.8261h-9.56522Z',
] as const;

const CONTOUR_SPIRAL_PATH = CONTOUR_PATHS.join(' ');

function MountainContour() {
  return (
    <svg
      aria-hidden="true"
      className="preloader-mountain-icon"
      viewBox="300 255 175 155"
    >
      <g className="preloader-mountain-base">
        {CONTOUR_PATHS.map((path) => (
          <path d={path} key={path} pathLength="1" />
        ))}
      </g>
      <path
        className="preloader-mountain-spiral"
        d={CONTOUR_SPIRAL_PATH}
        pathLength="1"
      />
    </svg>
  );
}

export function HomepagePreloader({
  onContinueWithoutTerrain,
  progress,
  reducedMotion,
  showBypass,
  state,
}: HomepagePreloaderProps) {
  const bypassRef = useRef<HTMLButtonElement>(null);
  const percentage = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const isReady = percentage === 100;

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
    >
      <p aria-live="polite" className="sr-only" role="status">
        {showBypass
          ? 'The homepage terrain is taking longer than expected.'
          : 'Loading homepage terrain.'}
      </p>
      <div aria-hidden="true" className="preloader-mountain-variant">
        <div className="preloader-mountain-lockup">
          <MountainContour />
          <div className="preloader-progress-readout">
            {reducedMotion ? (
              <span className="preloader-progress-value">
                {percentage}
              </span>
            ) : (
              <CountUp
                className="preloader-progress-value"
                durationMs={isReady
                  ? PRELOADER_CONFIG.countCompletionDurationMs
                  : PRELOADER_CONFIG.countApproachDurationMs}
                to={isReady ? 100 : PRELOADER_CONFIG.countLoadingLimit}
              />
            )}
            <span className="preloader-progress-unit">%</span>
          </div>
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
