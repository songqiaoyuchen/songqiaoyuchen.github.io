// The HTML hero name: decodes out of flickering glyphs on entrance, swaps to the alternate name on hover (mouse)
// or for a moment on tap (touch), and glows with a text-shadow stack plus a blurred twin (Hero.css).
// Screen readers get the name itself; the scrambled text is decoration.
'use client';

import {useEffect, useRef} from 'react';
import {HERO_REVEAL, HERO_SCENE_CONFIG, HERO_SCRAMBLE} from '@/config/hero';
import {HERO_CONTENT} from '@/data/hero';
import {heroStyles} from './Hero.styles';
import {useScramble} from './useScramble';

export function HeroName({isHidden}: {isHidden: boolean}) {
  const {text, decodeTo, settle} = useScramble(HERO_CONTENT.name);
  const swapBackTimer = useRef<number | null>(null);
  const lastPointerType = useRef('mouse');
  const showingAlternate = useRef(false);

  const clearSwapBack = () => {
    if (swapBackTimer.current === null) return;
    window.clearTimeout(swapBackTimer.current);
    swapBackTimer.current = null;
  };
  const show = (alternate: boolean) => {
    showingAlternate.current = alternate;
    decodeTo(alternate ? HERO_CONTENT.hoverName : HERO_CONTENT.name);
  };

  // Entrance: break up and decode as the name's fade-in starts (the animate-hero-name delay).
  useEffect(() => {
    const timer = window.setTimeout(
      () => decodeTo(HERO_CONTENT.name, HERO_SCRAMBLE.entranceLeadMs),
      HERO_REVEAL.nameDelayMs,
    );
    return () => window.clearTimeout(timer);
  }, [decodeTo]);
  // A section opening fades the hero out: settle on the name so it returns as itself.
  useEffect(() => {
    if (!isHidden) return;
    clearSwapBack();
    showingAlternate.current = false;
    settle(HERO_CONTENT.name);
  }, [isHidden, settle]);
  useEffect(() => clearSwapBack, []);

  return (
    <h1 className={`${heroStyles.name} ${heroStyles.nameHtml}`} id="home-hero-title">
      <span className="sr-only">{HERO_CONTENT.name}</span>
      <span
        aria-hidden="true"
        className={`${heroStyles.nameGlow} ${isHidden ? 'pointer-events-none' : 'pointer-events-auto'}`}
        data-text={text}
        onPointerDown={(event) => {
          lastPointerType.current = event.pointerType;
        }}
        onPointerEnter={(event) => {
          if (event.pointerType !== 'mouse' || isHidden) return;
          clearSwapBack();
          show(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== 'mouse' || isHidden) return;
          show(false);
        }}
        // Touch has no hover: a tap swaps the name, which swaps back on its own or on the next tap.
        onClick={() => {
          if (lastPointerType.current === 'mouse' || isHidden) return;
          clearSwapBack();
          const alternate = !showingAlternate.current;
          show(alternate);
          if (!alternate) return;
          swapBackTimer.current = window.setTimeout(() => {
            swapBackTimer.current = null;
            show(false);
          }, HERO_SCENE_CONFIG.tapSwapHoldMs);
        }}
      >
        {text}
      </span>
    </h1>
  );
}
