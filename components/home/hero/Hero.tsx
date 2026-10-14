// Homepage hero: typed eyebrow, name and supporting lines over the scene; fades away when a section opens.
'use client';

import type {CSSProperties} from 'react';
import {HERO_ANNOTATION_LAYOUT, HERO_REVEAL} from '@/config/hero';
import {HERO_CONTENT} from '@/data/hero';
import {heroStyles} from './Hero.styles';
import {TypeReveal} from './TypeReveal';

interface HeroProps {
  isHidden: boolean;
  /** Show the HTML name instead of the WebGL one (unavailable in the terrain fallback). */
  useHtmlName?: boolean;
}

const annotationStyle = {
  '--hero-annotation-left': HERO_ANNOTATION_LAYOUT.desktopLeft,
  '--hero-eyebrow-top': HERO_ANNOTATION_LAYOUT.eyebrowTop,
  '--hero-supporting-top': HERO_ANNOTATION_LAYOUT.supportingTop,
} as CSSProperties;

export function Hero({isHidden, useHtmlName = false}: HeroProps) {
  return (
    <section
      aria-hidden={isHidden}
      aria-labelledby="home-hero-title"
      className={`${heroStyles.section} ${isHidden ? heroStyles.hidden : heroStyles.shown}`}
      style={annotationStyle}
    >
      <p className={heroStyles.eyebrow}>
        <TypeReveal
          className={heroStyles.eyebrowText}
          delay={HERO_REVEAL.eyebrowDelayMs}
          steps={HERO_CONTENT.eyebrow.length}
        >
          {HERO_CONTENT.eyebrow}
        </TypeReveal>
      </p>

      <h1
        className={`${heroStyles.name}
          ${useHtmlName ? heroStyles.nameHtml : heroStyles.nameWebGl}`}
        id="home-hero-title"
      >
        {/* SceneHeroName measures this box on mobile. */}
        <span data-hero-name-slot>{HERO_CONTENT.name}</span>
      </h1>

      <p className={heroStyles.supporting}>
        {HERO_CONTENT.supportingLines.map((line, index) => (
          <span
            className={`${heroStyles.supportingLine}
              ${index === 0 ? heroStyles.supportingLineFirst : heroStyles.supportingLineLast}`}
            key={line}
          >
            <TypeReveal
              delay={HERO_REVEAL.supportingDelaysMs[index === 0 ? 0 : 1]}
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
