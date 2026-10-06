// Carousel motion: measures the stage, springs one unwrapped position toward the selection and writes
// every slide's pose (CSS variables, size, opacity) directly each frame; React never renders the animation.
'use client';

import {useLayoutEffect, useRef, useState} from 'react';
import {useSpring} from 'motion/react';
import {CAROUSEL_CONFIG} from '@/config/art/carousel';
import {VIEWPORT_MEDIA} from '@/config/breakpoints';
import {FEATURED_ARTWORKS} from '@/data/artworks';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {carouselLayout, frameSize, loopOffset} from '@/lib/art/carouselLayout';

export type StageSize = {width: number; height: number; vertical: boolean};

export function useCarouselMotion(index: number, all: boolean) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState<StageSize>({width: 0, height: 0, vertical: false});

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const media = window.matchMedia(VIEWPORT_MEDIA.touchOrNarrow);
    const measure = () => setStageSize({
      width: stage.clientWidth, height: stage.clientHeight, vertical: media.matches,
    });
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    media.addEventListener('change', measure);
    measure();
    return () => {
      observer.disconnect();
      media.removeEventListener('change', measure);
    };
  }, [all]);

  // One unwrapped position drives every slide; it advances by the shortest
  // loop distance so wrapping never spins the carousel the long way round.
  const reducedMotion = useReducedMotion();
  const position = useSpring(0, CAROUSEL_CONFIG.spring);
  const positionTarget = useRef(0);
  // Set by user input; URL restores and history navigation jump instead.
  const animateSelectionRef = useRef(false);
  useLayoutEffect(() => {
    positionTarget.current += loopOffset(index - positionTarget.current, FEATURED_ARTWORKS.length);
    // URL restores and history navigation place the carousel without motion.
    if (animateSelectionRef.current && !reducedMotion) position.set(positionTarget.current);
    else position.jump(positionTarget.current);
    animateSelectionRef.current = false;
  }, [index, position, reducedMotion]);

  // Write poses directly each frame; React never renders the animated values.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || !stageSize.width) return;
    const sizes = FEATURED_ARTWORKS.map((artwork) => frameSize(artwork, stageSize));
    const slides = Array.from(stage.children) as HTMLElement[];
    const apply = (value: number) => {
      const layout = carouselLayout(sizes, value, stageSize.vertical);
      stage.style.setProperty('--art-frame-half-height', `${layout.centerHeight / 2}px`);
      layout.slides.forEach((pose, slideIndex) => {
        const style = slides[slideIndex].style;
        style.setProperty('--offset', `${pose.offset}`);
        style.setProperty('--abs-offset', `${Math.abs(pose.offset)}`);
        style.setProperty('--shift', `${pose.shift}px`);
        style.width = `${pose.width}px`;
        style.height = `${pose.height}px`;
        style.opacity = `${pose.opacity}`;
        style.zIndex = pose.front ? '1' : '0';
      });
    };
    apply(position.get());
    return position.on('change', apply);
  }, [all, position, stageSize]);

  return {stageRef, stageSize, animateSelectionRef};
}
