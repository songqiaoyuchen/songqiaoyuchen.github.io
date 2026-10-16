// Text scramble for the HTML hero name: a decode that breaks the shown text into flickering glyphs from the left
// and settles the target out of them a column at a time (timings in HERO_SCRAMBLE).
'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {HERO_SCRAMBLE} from '@/config/hero';
import {useReducedMotion} from '@/hooks/useReducedMotion';

const randomGlyph = () => HERO_SCRAMBLE.glyphs[Math.floor(Math.random() * HERO_SCRAMBLE.glyphs.length)];

export function useScramble(initial: string) {
  const [text, setText] = useState(initial);
  const isReducedMotion = useReducedMotion();
  const frame = useRef<number | null>(null);
  // What the text last settled on (or is settling on): the next decode breaks up from here.
  const settled = useRef(initial);

  const stop = useCallback(() => {
    if (frame.current === null) return;
    window.cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);
  useEffect(() => stop, [stop]);

  /** Show the target at once, with no scramble. */
  const settle = useCallback((target: string) => {
    stop();
    settled.current = target;
    setText(target);
  }, [stop]);

  /** Decode into the target; a longer lead keeps the glyphs flickering before the first column settles. */
  const decodeTo = useCallback((target: string, leadMs: number = HERO_SCRAMBLE.leadMs) => {
    if (isReducedMotion) {
      settle(target);
      return;
    }
    stop();
    const from = settled.current;
    settled.current = target;
    const columns = Math.max(from.length, target.length);
    const {frameMs, jitterMs, outStepMs, settleStepMs} = HERO_SCRAMBLE;
    // Per column: when it breaks up and when it settles, jittered so the fronts are ragged.
    const breakAt = Array.from({length: columns}, (_, c) => c * outStepMs + Math.random() * jitterMs * 0.4);
    const settleAt = Array.from({length: columns}, (_, c) => leadMs + c * settleStepMs + Math.random() * jitterMs);
    const start = performance.now();
    let lastTick = -1;

    const tick = (now: number) => {
      const elapsed = now - start;
      const tickIndex = Math.floor(elapsed / frameMs);
      if (tickIndex !== lastTick) {
        lastTick = tickIndex;
        let next = '';
        let done = true;
        for (let c = 0; c < columns; c++) {
          if (elapsed < breakAt[c]) {
            next += from[c] ?? ' ';
            done = false;
          } else if (elapsed < settleAt[c]) {
            next += randomGlyph();
            done = false;
          } else {
            next += target[c] ?? ' ';
          }
        }
        setText(next);
        if (done) {
          frame.current = null;
          return;
        }
      }
      frame.current = window.requestAnimationFrame(tick);
    };
    frame.current = window.requestAnimationFrame(tick);
  }, [isReducedMotion, settle, stop]);

  return {text, decodeTo, settle};
}
