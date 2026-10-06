// Returning from an inspected artwork: refocus the work it was opened from and restore the scroll position.
'use client';

import {useEffect, useRef, type RefObject} from 'react';
import type {Artwork} from '@/data/artworks';

type ReturnContext = {id: string; scroll: number};

export function useInspectionReturn(inspecting: Artwork | undefined, stageRef: RefObject<HTMLDivElement | null>) {
  const openedHere = useRef(false);
  const returnContext = useRef<ReturnContext | null>(null);
  const previousInspection = useRef(false);

  useEffect(() => {
    const wasInspecting = previousInspection.current;
    previousInspection.current = !!inspecting;
    if (!wasInspecting || inspecting) return;
    const frame = requestAnimationFrame(() => {
      const context = returnContext.current;
      const target = context
        ? document.querySelector<HTMLElement>(`[data-artwork-id="${context.id}"]`)
        : stageRef.current;
      target?.focus({preventScroll: true});
      if (context) window.scrollTo(0, context.scroll);
    });
    return () => cancelAnimationFrame(frame);
  }, [inspecting, stageRef]);

  /** Call when a work is opened from this page, so closing can go back in history. */
  function rememberCollection(id: string) {
    openedHere.current = true;
    returnContext.current = {id, scroll: window.scrollY};
  }

  return {openedHere, rememberCollection};
}
