// Marks a drawer panel with data-at-start / data-at-end as its column scrolls, for edge fades. Reads and writes
// once per frame, and writes only on change: scroll events come faster than frames, and each write invalidates
// style.
'use client';

import {useCallback, useEffect, useRef} from 'react';

export function usePanelScrollEdges(isOpen: boolean, trackStart: boolean) {
  const shellRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);

  const updateScrollState = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = 0;
      const shell = shellRef.current;
      const scroll = scrollRef.current;
      if (!shell || !scroll) return;

      if (trackStart) {
        const atStart = String(scroll.scrollTop <= 1);
        if (shell.dataset.atStart !== atStart) shell.dataset.atStart = atStart;
      }
      const atEnd = String(scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop <= 1);
      if (shell.dataset.atEnd !== atEnd) shell.dataset.atEnd = atEnd;
    });
  }, [trackStart]);

  useEffect(() => {
    if (!isOpen) return;

    updateScrollState();
    return () => {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
  }, [isOpen, updateScrollState]);

  return {shellRef, scrollRef, updateScrollState};
}
