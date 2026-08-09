'use client';

import type {CSSProperties, ReactNode} from 'react';
import {HERO_ANNOTATION_LAYOUT, HERO_CONTENT} from '@/config/hero';

interface HeroProps {
  isHidden: boolean;
  useHtmlDesktopName?: boolean;
}

const annotationStyle = {
  '--hero-annotation-left': HERO_ANNOTATION_LAYOUT.desktopLeft,
  '--hero-eyebrow-top': HERO_ANNOTATION_LAYOUT.eyebrowTop,
  '--hero-supporting-top': HERO_ANNOTATION_LAYOUT.supportingTop,
} as CSSProperties;

function TypeReveal({
  children,
  delay,
  steps,
  className = '',
}: {
  children: ReactNode;
  delay: number;
  steps: number;
  className?: string;
}) {
  const style = {
    '--type-reveal-delay': `${delay}ms`,
    '--type-reveal-steps': steps,
  } as CSSProperties;

  return (
    <span className={`hero-type-reveal ${className}`} style={style}>
      {children}
    </span>
  );
}

export function Hero({isHidden, useHtmlDesktopName = false}: HeroProps) {
  return (
    <section
      aria-hidden={isHidden}
      aria-labelledby="home-hero-title"
      className={`absolute inset-0 z-30 flex flex-col justify-start px-6 pt-18 pb-8 font-mono text-left
        transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-opacity
        motion-reduce:duration-150 md:block md:w-auto md:max-w-none md:p-0 md:pointer-events-none
        ${
          isHidden
            ? 'pointer-events-none -translate-y-2 opacity-0'
            : 'pointer-events-none translate-y-0 opacity-100'
        }`}
      style={annotationStyle}
    >
      <p className="m-0 text-hero-eyebrow leading-[1.4] tracking-eyebrow
        text-muted-soft uppercase md:absolute md:top-(--hero-eyebrow-top)
        md:left-(--hero-annotation-left) md:text-hero-annotation">
        <TypeReveal
          className="relative whitespace-nowrap after:absolute after:top-[0.15em] after:left-full
            after:h-[1em] after:w-px after:animate-hero-cursor after:bg-accent-muted
            after:content-[''] motion-reduce:after:hidden motion-reduce:after:animate-none"
          delay={120}
          steps={HERO_CONTENT.eyebrow.length}
        >
          {HERO_CONTENT.eyebrow}
        </TypeReveal>
      </p>

      <h1
        className={`mt-3 mb-0 translate-y-2 animate-hero-name text-hero-title leading-[0.85]
          font-normal tracking-role text-accent-soft opacity-0 blur-reveal
          text-shadow-(--shadow-hero) transition-[color,text-shadow] duration-300 ease-out
          motion-reduce:translate-y-0 motion-reduce:animate-none motion-reduce:opacity-100
          motion-reduce:blur-none motion-reduce:transition-none md:m-0
          ${useHtmlDesktopName
            ? 'md:absolute md:top-[34svh] md:left-[54.5vw] md:text-[clamp(3.5rem,7vw,6rem)]'
            : 'md:sr-only'}`}
        id="home-hero-title"
      >
        {HERO_CONTENT.name}
      </h1>

      <p
        className="mt-7 mb-0 grid gap-3 text-hero-support leading-[1.55] tracking-support
          text-muted-soft uppercase md:absolute md:top-(--hero-supporting-top)
          md:left-(--hero-annotation-left) md:m-0 md:grid md:gap-2
          md:w-[min(40vw,var(--container-annotation))]
          md:text-hero-annotation"
      >
        {HERO_CONTENT.supportingLines.map((line, index) => (
          <span
            className={`block translate-y-1 opacity-0 motion-reduce:translate-y-0
              motion-reduce:animate-none motion-reduce:opacity-100
              ${index === 0 ? 'animate-hero-support-first' : 'animate-hero-support-last'}`}
            key={line}
          >
            <TypeReveal
              delay={index === 0 ? 1760 : 2460}
              steps={line.length}
            >
              {line}
            </TypeReveal>
          </span>
        ))}
      </p>
    </section>
  );
}
