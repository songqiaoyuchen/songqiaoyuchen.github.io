'use client';

import styles from './Hero.module.css';
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
      className={`${styles.hero} ${isHidden ? styles.hidden : styles.visible}`}
      style={annotationStyle}
    >
      <p className={styles.eyebrow}>
        <span className={styles.typedEyebrow}>{HERO_CONTENT.eyebrow}</span>
      </p>

      <h1 className={styles.name} id="home-hero-title">
        {HERO_CONTENT.name}
      </h1>

      <p className={styles.supportingCopy}>
        {HERO_CONTENT.supportingLines.map((line) => (
          <span className={styles.supportingLine} key={line}>{line}</span>
        ))}
      </p>
    </section>
  );
}
