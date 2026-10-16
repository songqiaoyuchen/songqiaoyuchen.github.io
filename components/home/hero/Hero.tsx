// Homepage hero: typed eyebrow, name and supporting lines over the scene; fades away when a section opens.
'use client';

import type {CSSProperties} from 'react';
import {HERO_ANNOTATION_LAYOUT, HERO_REVEAL} from '@/config/hero';
import {HERO_CONTENT} from '@/data/hero';
import {heroStyles} from './Hero.styles';
import {HeroName} from './HeroName';
import {TypeReveal} from './TypeReveal';

interface HeroProps {
  isHidden: boolean;
  /** Show the HTML name (HeroName) instead of leaving a box for the WebGL one (SceneHeroName). */
  useHtmlName?: boolean;
}

const {desktopLeft, eyebrowLeading, eyebrowTop, htmlName, supportingTop} = HERO_ANNOTATION_LAYOUT;
// Desktop: the gap between the eyebrow's bottom and the HTML name's top, repeated under the name.
const htmlNameGap = `(${htmlName.top} - ${eyebrowTop} - ${eyebrowLeading} * var(--text-hero-annotation))`;
const annotationStyle = {
  '--hero-annotation-left': desktopLeft,
  '--hero-eyebrow-top': eyebrowTop,
  '--hero-name-top': htmlName.top,
  '--hero-name-size': htmlName.size,
  '--hero-supporting-top': supportingTop,
} as CSSProperties;
const htmlNameAnnotationStyle = {
  ...annotationStyle,
  '--hero-supporting-top': `calc(${htmlName.top} + ${htmlName.leading} * ${htmlName.size} + ${htmlNameGap})`,
} as CSSProperties;

export function Hero({isHidden, useHtmlName = false}: HeroProps) {
  return (
    <section
      aria-hidden={isHidden}
      aria-labelledby="home-hero-title"
      className={`${heroStyles.section} ${isHidden ? heroStyles.hidden : heroStyles.shown}`}
      style={useHtmlName ? htmlNameAnnotationStyle : annotationStyle}
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

      {useHtmlName ? (
        <HeroName isHidden={isHidden} />
      ) : (
        <h1 className={`${heroStyles.name} ${heroStyles.nameWebGl}`} id="home-hero-title">
          {/* SceneHeroName measures this box on mobile. */}
          <span data-hero-name-slot>{HERO_CONTENT.name}</span>
        </h1>
      )}

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
