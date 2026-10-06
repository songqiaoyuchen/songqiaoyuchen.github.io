// Marks a drawer panel with data-at-start / data-at-end as its column scrolls, for edge fades.
'use client';

import {useCallback, useEffect, useRef} from 'react';

export function usePanelScrollEdges(isOpen: boolean, trackStart: boolean) {
  const shellRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const updateScrollState = useCallback(() => {
    const shell = shellRef.current;
    const scroll = scrollRef.current;
    if (!shell || !scroll) return;

    if (trackStart) shell.dataset.atStart = String(scroll.scrollTop <= 1);
    shell.dataset.atEnd = String(
      scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop <= 1,
    );
  }, [trackStart]);

  useEffect(() => {
    if (!isOpen) return;

    const frame = window.requestAnimationFrame(updateScrollState);
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, updateScrollState]);

  return {shellRef, scrollRef, updateScrollState};
}
