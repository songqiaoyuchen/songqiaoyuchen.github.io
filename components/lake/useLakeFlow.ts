// The lake dive's flow: the overview, the flight down, the dive, the bottle and the letter (or the hull giving out),
// the flight back. The shell holds it; the timers run on LAKE_FLOW, which the camera's flights (LakeDive) read too,
// so the veil goes dark as the camera reaches the water and lifts as the crack is in place.
'use client';

import {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {LAKE_FLOW} from '@/config/scene/lake';
import {
  markLakeHydrated, readLakeCompleted, subscribeLakeCompleted, writeLakeCompleted, type LakeState,
} from './lakeState';

const neverCompleted = () => false;

export function useLakeFlow(enabled: boolean) {
  const [state, setState] = useState<LakeState>('idle');
  const [letterOpen, setLetterOpen] = useState(false);
  const [veilDark, setVeilDark] = useState(false);
  // What the browser remembers of a finished dive (false on the server and the first client render).
  const completed = useSyncExternalStore(subscribeLakeCompleted, readLakeCompleted, neverCompleted);
  const timers = useRef<number[]>([]);
  // The stage as the callbacks see it: every transition writes it, so the callbacks keep their identity (the
  // memoized canvas takes them as props) without stale closures.
  const stage = useRef<LakeState>('idle');

  const clearTimers = useCallback(() => {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current = [];
  }, []);
  const after = useCallback((seconds: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, seconds * 1000));
  }, []);

  useEffect(() => clearTimers, [clearTimers]);
  useEffect(markLakeHydrated, []);

  const enter = useCallback(() => {
    if (stage.current !== 'idle') return;
    clearTimers();
    stage.current = 'entering';
    setState('entering');
    after(LAKE_FLOW.entryVeilAt, () => setVeilDark(true));
    after(LAKE_FLOW.entryFlight, () => {
      stage.current = 'diving';
      setState('diving');
      setVeilDark(false);
    });
  }, [after, clearTimers]);

  const found = useCallback(() => {
    if (stage.current !== 'diving') return;
    clearTimers();
    stage.current = 'found';
    setState('found');
    writeLakeCompleted();
  }, [clearTimers]);

  // Up from the crack: the veil darkens, the camera is set above the water, the flight back and the veil lifting.
  const surfaceFromCrack = useCallback(() => {
    clearTimers();
    stage.current = 'surfacing';
    setState('surfacing');
    setVeilDark(true);
    after(LAKE_FLOW.surfaceVeil, () => {
      stage.current = 'returning';
      setState('returning');
      setVeilDark(false);
    });
    after(LAKE_FLOW.surfaceVeil + LAKE_FLOW.returnFlight, () => {
      stage.current = 'idle';
      setState('idle');
    });
  }, [after, clearTimers]);

  // The hull gave out: the dead screen holds a moment, then the dive surfaces on its own.
  const breach = useCallback(() => {
    if (stage.current !== 'diving') return;
    clearTimers();
    stage.current = 'breached';
    setState('breached');
    after(LAKE_FLOW.breachHold, surfaceFromCrack);
  }, [after, clearTimers, surfaceFromCrack]);

  const surface = useCallback(() => {
    setLetterOpen(false);
    const current = stage.current;
    if (current === 'idle' || current === 'surfacing' || current === 'returning') return;
    if (current === 'entering') {
      // Not yet under: fly straight back.
      clearTimers();
      stage.current = 'returning';
      setState('returning');
      setVeilDark(false);
      after(LAKE_FLOW.returnFlight, () => {
        stage.current = 'idle';
        setState('idle');
      });
      return;
    }
    surfaceFromCrack();
  }, [after, clearTimers, surfaceFromCrack]);

  const openLetter = useCallback(() => setLetterOpen(true), []);
  const closeLetter = useCallback(() => {
    setLetterOpen(false);
    // Closing the letter in the crack surfaces; from the overview it only closes.
    if (stage.current === 'found') surfaceFromCrack();
  }, [surfaceFromCrack]);

  // A section opening or the route leaving ends the dive at once: the stages settle before rendering (like the
  // shell's own section resets) and the pending timers go with the commit.
  if (!enabled && (state !== 'idle' || veilDark || letterOpen)) {
    setState('idle');
    setVeilDark(false);
    setLetterOpen(false);
  }
  useEffect(() => {
    if (enabled) return;
    clearTimers();
    stage.current = 'idle';
  }, [clearTimers, enabled]);

  return {state, letterOpen, veilDark, completed, enter, found, breach, surface, openLetter, closeLetter};
}
