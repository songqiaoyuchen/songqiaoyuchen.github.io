// Scroll-driven About timeline: draws the route line to a reading head and activates the markers it passes.
// Writes --timeline-* custom properties and the panel's data-at-start/end directly, outside React renders.
'use client';

import {useEffect, useRef, useState, type RefObject} from 'react';
import {ABOUT_TIMELINE} from '@/data/about';

// The reading head sits this far down the scroll column.
const READING_HEAD = 0.58;
// Hysteresis (px) so a marker does not flicker at the reading head.
const ENTER_OFFSET = 10;
const LEAVE_OFFSET = 18;

export function useTimelineProgress(
  isOpen: boolean,
  shellRef: RefObject<HTMLDivElement | null>,
  scrollRef: RefObject<HTMLDivElement | null>,
) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const activeIndexRef = useRef(-1);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Incremented per marker to replay its ripple animation.
  const [rippleCounts, setRippleCounts] = useState<readonly number[]>(
    () => Array.from({length: ABOUT_TIMELINE.length}, () => 0),
  );
  const [isNowVisible, setIsNowVisible] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const shell = shellRef.current;
    const scroller = scrollRef.current;
    const timeline = timelineRef.current;
    if (!shell || !scroller || !timeline) return;
    const shellElement = shell;
    const scrollerElement = scroller;
    const timelineElement = timeline;

    let animationFrame = 0;
    let timelineOffset = 0;
    let markerOffsets: number[] = [];

    function startRipple(index: number) {
      setRippleCounts((current) => current.map((count, currentIndex) => (
        currentIndex === index ? count + 1 : count
      )));
    }

    function measureTimeline() {
      const scrollerRect = scrollerElement.getBoundingClientRect();
      const timelineRect = timelineElement.getBoundingClientRect();
      timelineOffset = timelineRect.top - scrollerRect.top + scrollerElement.scrollTop;
      markerOffsets = markerRefs.current.map((marker) => {
        if (!marker) return 0;
        const markerRect = marker.getBoundingClientRect();
        return markerRect.top - timelineRect.top + markerRect.height / 2;
      });

      const routeStart = markerOffsets[0] ?? 0;
      const routeEnd = markerOffsets.at(-1) ?? routeStart;
      timelineElement.style.setProperty('--timeline-start-px', `${routeStart}px`);
      timelineElement.style.setProperty('--timeline-length-px', `${routeEnd - routeStart}px`);
    }

    function updateTimeline() {
      animationFrame = 0;

      const readingHead = scrollerElement.scrollTop
        + scrollerElement.clientHeight * READING_HEAD
        - timelineOffset;
      const routeStart = markerOffsets[0] ?? 0;
      const routeEnd = markerOffsets.at(-1) ?? routeStart;
      const drawn = Math.min(Math.max(readingHead - routeStart, 0), routeEnd - routeStart);
      timelineElement.style.setProperty('--timeline-drawn-px', `${drawn}px`);

      let nextIndex = activeIndexRef.current;
      while (
        nextIndex + 1 < markerOffsets.length
        && readingHead >= markerOffsets[nextIndex + 1] + ENTER_OFFSET
      ) {
        nextIndex += 1;
      }
      while (nextIndex >= 0 && readingHead < markerOffsets[nextIndex] - LEAVE_OFFSET) {
        nextIndex -= 1;
      }

      if (nextIndex !== activeIndexRef.current) {
        const previousIndex = activeIndexRef.current;
        activeIndexRef.current = nextIndex;
        setActiveIndex(nextIndex);
        if (nextIndex > previousIndex) {
          for (let index = Math.max(previousIndex + 1, 0); index <= nextIndex; index += 1) {
            startRipple(index);
          }
        } else if (nextIndex >= 0) {
          startRipple(nextIndex);
        }
      }

      shellElement.dataset.atStart = String(scrollerElement.scrollTop <= 2);
      shellElement.dataset.atEnd = String(
        scrollerElement.scrollTop + scrollerElement.clientHeight
          >= scrollerElement.scrollHeight - 2,
      );
    }

    function scheduleUpdate() {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateTimeline);
    }

    function handleResize() {
      measureTimeline();
      scheduleUpdate();
    }

    measureTimeline();
    updateTimeline();
    scrollerElement.addEventListener('scroll', scheduleUpdate, {passive: true});

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(scrollerElement);
    resizeObserver.observe(timelineElement);

    // The current entry pulses only while it is on screen.
    const nowMarker = markerRefs.current[0];
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => setIsNowVisible(entry?.isIntersecting ?? false),
      {root: scrollerElement, threshold: 0.05},
    );
    if (nowMarker) visibilityObserver.observe(nowMarker);

    return () => {
      scrollerElement.removeEventListener('scroll', scheduleUpdate);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      setIsNowVisible(false);
    };
  }, [isOpen, scrollRef, shellRef]);

  return {timelineRef, markerRefs, activeIndex, rippleCounts, isNowVisible};
}
