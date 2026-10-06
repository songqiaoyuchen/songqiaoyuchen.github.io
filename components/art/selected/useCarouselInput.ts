// Carousel input: wheel, drag/swipe, arrow keys and buttons step the selection; the URL (?selected=) is the state.
// Also keeps the outgoing wall label for its fade-out.
'use client';

import {useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent,
  type PointerEvent, type RefObject} from 'react';
import {CAROUSEL_CONFIG} from '@/config/art/carousel';
import {VIEWPORT_MEDIA} from '@/config/breakpoints';
import {FEATURED_ARTWORKS, type Artwork} from '@/data/artworks';
import {useReducedMotion} from '@/hooks/useReducedMotion';

const STEP_KEYS = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
const FORWARD_KEYS = ['ArrowRight', 'ArrowDown'];

// Read the URL, not render state: several steps can land before React re-renders.
export function selectedIndexFromUrl() {
  const id = new URLSearchParams(window.location.search).get('selected');
  return Math.max(0, FEATURED_ARTWORKS.findIndex((artwork) => artwork.id === id));
}

type CarouselInputOptions = {
  stageRef: RefObject<HTMLDivElement | null>;
  animateSelectionRef: RefObject<boolean>;
  enabled: boolean;
};

export function useCarouselInput({stageRef, animateSelectionRef, enabled}: CarouselInputOptions) {
  const reducedMotion = useReducedMotion();
  const pointer = useRef<{x: number; y: number} | null>(null);
  const dragged = useRef(false);
  const wheel = useRef({delta: 0, timer: 0});

  // The outgoing label fades beneath the incoming one, outside the live region.
  const [leaving, setLeaving] = useState<Artwork | null>(null);
  const select = useCallback((next: number) => {
    animateSelectionRef.current = true;
    const artwork = FEATURED_ARTWORKS[(next + FEATURED_ARTWORKS.length) % FEATURED_ARTWORKS.length];
    const previous = FEATURED_ARTWORKS[selectedIndexFromUrl()];
    if (previous !== artwork && !reducedMotion) setLeaving(previous);
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set('selected', artwork.id);
    // Selection replaces the history entry rather than adding one.
    window.history.replaceState(null, '', `${window.location.pathname}?${nextParams}`);
  }, [animateSelectionRef, reducedMotion]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !enabled) return;
    const gesture = wheel.current;
    // Every wheel step moves the carousel; fast or reversed scrolling is never ignored.
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      window.clearTimeout(gesture.timer);
      gesture.timer = window.setTimeout(() => { gesture.delta = 0; }, CAROUSEL_CONFIG.wheelResetMs);
      const raw = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      const delta = raw * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1);
      // Reversing discards travel accumulated in the old direction.
      if (Math.sign(delta) !== Math.sign(gesture.delta)) gesture.delta = 0;
      gesture.delta += delta;
      if (Math.abs(gesture.delta) < CAROUSEL_CONFIG.wheelStep) return;
      select(selectedIndexFromUrl() + Math.sign(gesture.delta));
      gesture.delta = 0;
    };
    stage.addEventListener('wheel', onWheel, {passive: false});
    return () => {
      stage.removeEventListener('wheel', onWheel);
      window.clearTimeout(gesture.timer);
    };
  }, [enabled, select, stageRef]);

  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointer.current;
    pointer.current = null;
    if (!start) return;
    const vertical = window.matchMedia(VIEWPORT_MEDIA.touchOrNarrow).matches;
    const distance = vertical ? start.y - event.clientY : start.x - event.clientX;
    if (Math.abs(distance) > CAROUSEL_CONFIG.swipeStep) {
      dragged.current = true;
      select(selectedIndexFromUrl() + Math.sign(distance));
    }
  };

  /** Handlers for the carousel region element. */
  const stageHandlers = {
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;
      if (STEP_KEYS.includes(event.key)) {
        event.preventDefault();
        select(
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? FEATURED_ARTWORKS.length - 1
              : selectedIndexFromUrl() + (FORWARD_KEYS.includes(event.key) ? 1 : -1),
        );
      }
    },
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      pointer.current = {x: event.clientX, y: event.clientY};
      dragged.current = false;
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      if (
        pointer.current &&
        Math.hypot(event.clientX - pointer.current.x, event.clientY - pointer.current.y) > CAROUSEL_CONFIG.dragStart
      ) {
        dragged.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    onPointerUp: endPointer,
    onPointerCancel: () => {
      pointer.current = null;
    },
    // A drag must not also open the work it ended on.
    onClickCapture: (event: MouseEvent<HTMLDivElement>) => {
      if (dragged.current) {
        event.preventDefault();
        event.stopPropagation();
        dragged.current = false;
      }
    },
  };

  return {select, leaving, setLeaving, stageHandlers};
}
