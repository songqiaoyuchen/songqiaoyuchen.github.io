'use client';

import type {CSSProperties} from 'react';
import {HERO_ANNOTATION_LAYOUT, HERO_CONTENT} from '@/config/hero';

interface HeroProps {
  isHidden: boolean;
}

const annotationStyle = {
  '--hero-annotation-left': HERO_ANNOTATION_LAYOUT.desktopLeft,
  '--hero-eyebrow-top': HERO_ANNOTATION_LAYOUT.eyebrowTop,
  '--hero-supporting-top': HERO_ANNOTATION_LAYOUT.supportingTop,
} as CSSProperties;

export function Hero({isHidden}: HeroProps) {
  return (
    <section
      aria-hidden={isHidden}
      aria-labelledby="home-hero-title"
      className={`absolute inset-x-6 top-hero-top z-30 max-w-md font-mono text-left
        transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-opacity
        motion-reduce:duration-150 md:inset-0 md:w-auto md:max-w-none md:pointer-events-none
        ${
          isHidden
            ? 'pointer-events-none -translate-y-2 opacity-0'
            : 'pointer-events-auto translate-y-0 opacity-100'
        }`}
      style={annotationStyle}
    >
      <p className="m-0 h-[1.4em] text-hero-eyebrow leading-[1.4] tracking-eyebrow
        text-muted-soft uppercase md:absolute md:top-(--hero-eyebrow-top)
        md:left-(--hero-annotation-left) md:text-hero-annotation">
        <span
          className="relative inline-block w-max animate-hero-eyebrow overflow-visible whitespace-nowrap
            [clip-path:inset(0_100%_0_0)] after:absolute after:top-[0.15em] after:left-full
            after:h-[1em] after:w-px after:animate-hero-cursor after:bg-accent-muted
            after:content-[''] motion-reduce:w-auto motion-reduce:animate-none
            motion-reduce:[clip-path:none] motion-reduce:after:hidden motion-reduce:after:animate-none"
        >
          {HERO_CONTENT.eyebrow}
        </span>
      </p>

      <h1
        className="m-0 translate-y-2 animate-hero-name text-hero-title leading-[0.85]
          font-normal tracking-role text-accent-soft opacity-0 blur-reveal
          text-shadow-(--shadow-hero) transition-[color,text-shadow] duration-300 ease-out
          motion-reduce:translate-y-0 motion-reduce:animate-none motion-reduce:opacity-100
          motion-reduce:blur-none motion-reduce:transition-none md:sr-only"
        id="home-hero-title"
      >
        {HERO_CONTENT.name}
      </h1>

      <p
        className="mt-5 mb-0 grid gap-2 text-hero-support leading-[1.55] tracking-support
          text-muted-soft uppercase md:absolute md:top-(--hero-supporting-top)
          md:left-(--hero-annotation-left) md:m-0 md:w-[min(40vw,var(--container-annotation))]
          md:text-hero-annotation"
      >
        {HERO_CONTENT.supportingLines.map((line, index) => (
          <span
            className={`block translate-y-1 opacity-0 motion-reduce:translate-y-0
              motion-reduce:animate-none motion-reduce:opacity-100
              ${index === 0 ? 'animate-hero-support-first' : 'animate-hero-support-last'}`}
            key={line}
          >
            {line}
          </span>
        ))}
      </p>
    </section>
  );
}
