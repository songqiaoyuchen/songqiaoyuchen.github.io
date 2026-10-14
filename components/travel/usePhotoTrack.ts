// Photo viewer motion and input: one spring position drives the row (lib/travel/photoTrack.ts), written to the
// slides each frame without React renders. A drag follows the pointer and springs to the nearest photo, carried on by
// a flick; the wheel, keys, arrows, ruler and a tap on a neighbour step it. The URL (?photo=) holds the photo.
'use client';

import {useSpring} from 'motion/react';
import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent,
  type PointerEvent} from 'react';
import {VIEWPORT_MEDIA} from '@/config/breakpoints';
import {PHOTO_VIEWER_CONFIG} from '@/config/travel/photoViewer';
import type {GalleryPhoto} from '@/data/travel';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {photoFrame, photoTrackLayout, stepDistance} from '@/lib/travel/photoTrack';

const {spring, wheelStep, wheelResetMs, dragStart, swipeStep, flickMs, flickStaleMs, overscroll} = PHOTO_VIEWER_CONFIG;

type Drag = {x: number; y: number; from: number; active: boolean; lastX: number; lastTime: number; velocity: number};

export function usePhotoTrack(photos: readonly GalleryPhoto[], index: number) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({width: 0, height: 0, narrow: false});
  const reducedMotion = useReducedMotion();
  const position = useSpring(index, spring);
  const target = useRef(index);
  const last = photos.length - 1;
  const clamp = useCallback((photo: number) => Math.min(Math.max(photo, 0), last), [last]);
  // The photo nearest the moving row: its caption and ruler tick show while it slides.
  const [shown, setShown] = useState(index);
  const shownRef = useRef(index);

  const select = useCallback((next: number) => {
    const photo = clamp(next);
    target.current = photo;
    if (reducedMotion) position.jump(photo);
    else position.set(photo);
    const params = new URLSearchParams(window.location.search);
    params.set('photo', String(photo));
    // Stepping replaces the history entry: Back leaves the viewer, not each photo.
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
  }, [clamp, position, reducedMotion]);

  // The URL moved from outside (history, a link): place the row there without motion.
  useLayoutEffect(() => {
    if (index === target.current) return;
    target.current = index;
    position.jump(index);
  }, [index, position]);

  useLayoutEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const media = window.matchMedia(VIEWPORT_MEDIA.touchOrNarrow);
    const measure = () => setStage({width: element.clientWidth, height: element.clientHeight, narrow: media.matches});
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    media.addEventListener('change', measure);
    measure();
    return () => {
      observer.disconnect();
      media.removeEventListener('change', measure);
    };
  }, []);

  const sizes = useMemo(
    () => (stage.width ? photos.map((photo) => photoFrame(photo, stage, stage.narrow)) : []),
    [photos, stage],
  );

  // Write poses directly each frame; slides keep their frame size and scale, so nothing reflows.
  useLayoutEffect(() => {
    const element = stageRef.current;
    if (!element || !sizes.length) return;
    const slides = Array.from(element.children) as HTMLElement[];
    sizes.forEach((size, photo) => {
      slides[photo].style.width = `${size.width}px`;
      slides[photo].style.height = `${size.height}px`;
    });
    const apply = (value: number) => {
      photoTrackLayout(sizes, value).forEach((pose, photo) => {
        const style = slides[photo].style;
        style.transform = `translate(-50%, -50%) translateX(${pose.x}px) scale(${pose.scale})`;
        style.opacity = `${pose.opacity}`;
        style.visibility = pose.opacity > 0 ? '' : 'hidden';
      });
      const nearest = clamp(Math.round(value));
      if (nearest !== shownRef.current) {
        shownRef.current = nearest;
        setShown(nearest);
      }
    };
    apply(position.get());
    return position.on('change', apply);
  }, [clamp, position, sizes]);

  // Every wheel step moves one photo; reversing discards travel gathered the other way.
  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    let delta = 0;
    let timer = 0;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { delta = 0; }, wheelResetMs);
      const raw = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      const step = raw * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientWidth : 1);
      if (Math.sign(step) !== Math.sign(delta)) delta = 0;
      delta += step;
      if (Math.abs(delta) < wheelStep) return;
      select(target.current + Math.sign(delta));
      delta = 0;
    };
    element.addEventListener('wheel', onWheel, {passive: false});
    return () => {
      element.removeEventListener('wheel', onWheel);
      window.clearTimeout(timer);
    };
  }, [select]);

  const drag = useRef<Drag | null>(null);
  const dragged = useRef(false);

  const stageHandlers = {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || !sizes.length) return;
      const {clientX: x, clientY: y, timeStamp} = event;
      drag.current = {x, y, from: position.get(), active: false, lastX: x, lastTime: timeStamp, velocity: 0};
      dragged.current = false;
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const current = drag.current;
      if (!current) return;
      const dx = event.clientX - current.x;
      if (!current.active) {
        // A mostly vertical move stays a scroll.
        if (Math.abs(dx) < dragStart || Math.abs(dx) < Math.abs(event.clientY - current.y)) return;
        current.active = true;
        dragged.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      const elapsed = event.timeStamp - current.lastTime;
      if (elapsed > 0) current.velocity = (event.clientX - current.lastX) / elapsed;
      current.lastX = event.clientX;
      current.lastTime = event.timeStamp;
      const slot = stepDistance(sizes, clamp(Math.round(current.from)), dx < 0 ? 1 : -1);
      position.jump(Math.min(Math.max(current.from - dx / slot, -overscroll), last + overscroll));
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => {
      const current = drag.current;
      drag.current = null;
      if (!current?.active) return;
      const now = position.get();
      const velocity = event.timeStamp - current.lastTime > flickStaleMs ? 0 : current.velocity;
      const slot = stepDistance(sizes, clamp(Math.round(now)), velocity > 0 ? -1 : 1);
      let next = Math.round(now - (velocity * flickMs) / slot);
      const start = clamp(Math.round(current.from));
      const distance = event.clientX - current.x;
      // A deliberate swipe always moves on, however slowly it ends.
      if (next === start && Math.abs(distance) > swipeStep) next = start - Math.sign(distance);
      select(next);
    },
    onPointerCancel: () => {
      if (drag.current?.active) select(target.current);
      drag.current = null;
    },
    // A drag must not also select the photo it ended on.
    onClickCapture: (event: MouseEvent<HTMLDivElement>) => {
      if (!dragged.current) return;
      event.preventDefault();
      event.stopPropagation();
      dragged.current = false;
    },
  };

  /** Arrow keys, Home and End step the row; true when the key was one of them. */
  const handleKey = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      select(target.current + (event.key === 'ArrowRight' ? 1 : -1));
    }
    else if (event.key === 'Home') select(0);
    else if (event.key === 'End') select(last);
    else return false;
    event.preventDefault();
    return true;
  };

  return {stageRef, shown, select, stageHandlers, handleKey};
}
