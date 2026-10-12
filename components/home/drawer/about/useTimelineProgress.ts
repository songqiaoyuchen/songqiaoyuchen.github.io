// Scroll-driven About timeline: draws the route line to a reading head and activates the markers it passes.
// Writes --timeline-* custom properties and the panel's data-at-start/end directly, outside React renders.
// The markers are the entries plus a final "Next?" stop; scrollToStop brings any of them to the reading head.
'use client';

import {useCallback, useEffect, useRef, useState, type MutableRefObject, type RefObject} from 'react';
import {ABOUT_TIMELINE} from '@/data/about';
import {useReducedMotion} from '@/hooks/useReducedMotion';

/** A checkpoint click asking the panel to scroll to a stop; `key` repeats a request for the same stop. */
export type AboutScrollRequest = {stop: number; key: number};

// Entries, then "Next?".
export const TIMELINE_STOP_COUNT = ABOUT_TIMELINE.length + 1;
// The reading head sits this far down the scroll column; on phones, where the column sits under the path's window,
// near its top, so the entry being read is the one just under the window.
const READING_HEAD = 0.58;
const PHONE_READING_HEAD = 0.3;
const PHONE = '(width < 48rem)';
const readingHeadShare = (phone: MediaQueryList) => (phone.matches ? PHONE_READING_HEAD : READING_HEAD);
// Hysteresis (px) so a marker does not flicker at the reading head.
const ENTER_OFFSET = 10;
const LEAVE_OFFSET = 18;
// Scrolling to a stop lands its marker this far past the reading head, inside the hysteresis band.
const LAND_OFFSET = ENTER_OFFSET + 4;
const CURRENT_INDEX = ABOUT_TIMELINE.findIndex((entry) => entry.isCurrent);

/**
 * `progressRef` receives the reading head's position in stops (0 at the first marker, 1.5 halfway
 * between the second and third…), so the terrain path draws in step with the route line.
 */
export function useTimelineProgress(
  isOpen: boolean,
  shellRef: RefObject<HTMLDivElement | null>,
  scrollRef: RefObject<HTMLDivElement | null>,
  progressRef: MutableRefObject<number>,
) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const activeIndexRef = useRef(-1);
  const scrollToStopRef = useRef<(stop: number) => void>(() => {});
  const isReducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(-1);
  // Incremented per marker to replay its ripple animation.
  const [rippleCounts, setRippleCounts] = useState<readonly number[]>(
    () => Array.from({length: TIMELINE_STOP_COUNT}, () => 0),
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

    const phone = window.matchMedia(PHONE);
    let animationFrame = 0;
    let timelineOffset = 0;
    let markerOffsets: number[] = [];
    // The column's extent, measured with the markers (the observer covers the column and its content) rather
    // than read per scroll frame.
    let viewHeight = 0;
    let scrollHeight = 0;

    function startRipple(index: number) {
      setRippleCounts((current) => current.map((count, currentIndex) => (
        currentIndex === index ? count + 1 : count
      )));
    }

    function measureTimeline() {
      viewHeight = scrollerElement.clientHeight;
      scrollHeight = scrollerElement.scrollHeight;
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

      const scrollTop = scrollerElement.scrollTop;
      const readingHead = scrollTop + viewHeight * readingHeadShare(phone) - timelineOffset;
      const routeStart = markerOffsets[0] ?? 0;
      const routeEnd = markerOffsets.at(-1) ?? routeStart;
      const isAtEnd = scrollTop + viewHeight >= scrollHeight - 2;
      // The last stops may never reach the reading head; the end of the panel arrives at "Next?".
      const drawn = isAtEnd
        ? routeEnd - routeStart
        : Math.min(Math.max(readingHead - routeStart, 0), routeEnd - routeStart);
      timelineElement.style.setProperty('--timeline-drawn-px', `${drawn}px`);
      const head = routeStart + drawn;
      let segment = 0;
      while (segment + 2 < markerOffsets.length && head >= markerOffsets[segment + 1]) segment += 1;
      const span = (markerOffsets[segment + 1] ?? routeEnd) - markerOffsets[segment];
      progressRef.current = segment + (span > 0
        ? Math.min(Math.max((head - markerOffsets[segment]) / span, 0), 1)
        : 0);

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
      // The top of the panel is the overview, even where the first marker already meets the head.
      if (scrollTop <= 2) nextIndex = -1;
      else if (isAtEnd) nextIndex = markerOffsets.length - 1;

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

      const atStart = String(scrollTop <= 2);
      const atEnd = String(isAtEnd);
      if (shellElement.dataset.atStart !== atStart) shellElement.dataset.atStart = atStart;
      if (shellElement.dataset.atEnd !== atEnd) shellElement.dataset.atEnd = atEnd;
    }

    function scheduleUpdate() {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateTimeline);
    }

    function handleResize() {
      measureTimeline();
      scheduleUpdate();
    }

    scrollToStopRef.current = (stop) => {
      const maxScroll = scrollerElement.scrollHeight - scrollerElement.clientHeight;
      const top = stop < 0
        ? 0
        : stop >= markerOffsets.length - 1
          ? maxScroll
          : timelineOffset + markerOffsets[stop] + LAND_OFFSET
            - scrollerElement.clientHeight * readingHeadShare(phone);
      scrollerElement.scrollTo({
        top: Math.min(Math.max(top, 0), maxScroll),
        behavior: isReducedMotion ? 'auto' : 'smooth',
      });
    };

    measureTimeline();
    updateTimeline();
    scrollerElement.addEventListener('scroll', scheduleUpdate, {passive: true});

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(scrollerElement);
    resizeObserver.observe(timelineElement);

    // The current entry pulses only while it is on screen.
    const nowMarker = markerRefs.current[CURRENT_INDEX];
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => setIsNowVisible(entry?.isIntersecting ?? false),
      {root: scrollerElement, threshold: 0.05},
    );
    if (nowMarker) visibilityObserver.observe(nowMarker);

    return () => {
      scrollerElement.removeEventListener('scroll', scheduleUpdate);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      scrollToStopRef.current = () => {};
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      setIsNowVisible(false);
    };
  }, [isOpen, isReducedMotion, progressRef, scrollRef, shellRef]);

  // Ref callback registering the marker of one stop.
  const markerRef = useCallback((index: number) => (node: HTMLSpanElement | null) => {
    markerRefs.current[index] = node;
  }, []);

  return {timelineRef, markerRef, activeIndex, rippleCounts, isNowVisible, scrollToStopRef};
}
