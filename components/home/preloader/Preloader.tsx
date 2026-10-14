// Homepage preloader: contour mark and count-up while the terrain loads. On first arrival at the overview the
// exit is the intro's descent: the cover lifts off the scene (opened as a contour map straight above the summit,
// the same black), the mark fades into the summit's rings lighting up under it, and the preloader goes once the
// camera has landed on the overview. Opening on a section it simply fades. Offers "Enter without terrain" when
// loading is slow (styles in Preloader.css).
'use client';

import {useEffect, useRef} from 'react';
import {PRELOADER_CONFIG} from '@/config/preloader';
import {CountUp} from './CountUp';
import {MountainContour} from './MountainContour';
import {useNavLock} from './useNavLock';

export type PreloaderState = 'loading' | 'exiting';

type PreloaderProps = {
  /** The exit is the descent (the cover lifts at once); otherwise a fade. */
  descent: boolean;
  onContinueWithoutTerrain: () => void;
  progress: number;
  reducedMotion: boolean;
  showBypass: boolean;
  state: PreloaderState;
};

export function Preloader({
  descent,
  onContinueWithoutTerrain,
  progress,
  reducedMotion,
  showBypass,
  state,
}: PreloaderProps) {
  const bypassRef = useRef<HTMLButtonElement>(null);
  const percentage = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const isReady = percentage === 100;

  useNavLock();

  useEffect(() => {
    if (showBypass) bypassRef.current?.focus();
  }, [showBypass]);

  return (
    <div
      aria-busy={state === 'loading'}
      className="homepage-preloader"
      data-descent={descent || undefined}
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
