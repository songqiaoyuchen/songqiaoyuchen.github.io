'use client';

import {useEffect, useRef, useState, type RefObject} from 'react';
import {ABOUT_TIMELINE} from '@/data/aboutTimeline';

type TimelineState = 'upcoming' | 'active' | 'passed';

interface ExperienceTimelineProps {
  isOpen: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  shellRef: RefObject<HTMLDivElement | null>;
}

interface RippleMarkerProps {
  hasContinuation?: boolean;
  isCurrent?: boolean;
  isPulsing?: boolean;
  rippleCount: number;
  state: TimelineState;
}

const MARKER_STATE: Record<TimelineState, string> = {
  upcoming: 'border-dim bg-panel/96',
  active: 'border-accent bg-accent shadow-route-marker',
  passed: 'border-muted bg-muted',
};

const ENTRY_META = `m-0 font-mono text-label leading-[1.45] tracking-label text-muted-soft
  uppercase`;

function RippleMarker({
  hasContinuation = false,
  isCurrent = false,
  isPulsing = false,
  rippleCount,
  state,
}: RippleMarkerProps) {
  return (
    <span
      aria-hidden="true"
      className="relative grid size-8 place-items-center"
      data-current={isCurrent || undefined}
      data-pulsing={isPulsing || undefined}
      data-rippling={rippleCount > 0 || undefined}
      data-state={state}
    >
      {hasContinuation && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-32 w-2
            -translate-x-1/2 overflow-visible text-accent"
          preserveAspectRatio="none"
          viewBox="0 0 8 128"
        >
          <path
            d="M4 0V128"
            fill="none"
            stroke="currentColor"
            strokeDasharray="2 6"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      <span
        className={`relative z-2 block size-[0.32rem] rounded-full border
          transition-[border-color,background-color,box-shadow] duration-300 ease-out
          ${MARKER_STATE[state]}`}
      />
      {rippleCount > 0 && (
        <>
          <span
            className="pointer-events-none absolute z-1 size-2 animate-route-ripple-one
              rounded-full border border-accent-soft opacity-0 motion-reduce:hidden
              motion-reduce:animate-none"
            key={`ripple-one-${rippleCount}`}
          />
          <span
            className="pointer-events-none absolute z-1 size-2 animate-route-ripple-two
              rounded-full border border-accent-soft opacity-0 motion-reduce:hidden
              motion-reduce:animate-none"
            key={`ripple-two-${rippleCount}`}
          />
          <span
            className="pointer-events-none absolute z-1 size-2 animate-route-ripple-three
              rounded-full border-[0.75px] border-accent-soft opacity-0 motion-reduce:hidden
              motion-reduce:animate-none"
            key={`ripple-three-${rippleCount}`}
          />
        </>
      )}
      <span
        className={`pointer-events-none absolute z-1 size-2 rounded-full border-[0.75px]
          border-accent-soft opacity-0 motion-reduce:hidden motion-reduce:animate-none
          ${isPulsing ? 'animate-current-signal' : ''}`}
      />
    </span>
  );
}

function getTimelineState(index: number, activeIndex: number): TimelineState {
  if (index === activeIndex) return 'active';
  if (index < activeIndex) return 'passed';
  return 'upcoming';
}

export function ExperienceTimeline({isOpen, scrollRef, shellRef}: ExperienceTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const activeIndexRef = useRef(-1);
  const [activeIndex, setActiveIndex] = useState(-1);
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
        + scrollerElement.clientHeight * 0.58
        - timelineOffset;
      const routeStart = markerOffsets[0] ?? 0;
      const routeEnd = markerOffsets.at(-1) ?? routeStart;
      const drawn = Math.min(Math.max(readingHead - routeStart, 0), routeEnd - routeStart);
      timelineElement.style.setProperty('--timeline-drawn-px', `${drawn}px`);

      let nextIndex = activeIndexRef.current;
      while (
        nextIndex + 1 < markerOffsets.length
        && readingHead >= markerOffsets[nextIndex + 1] + 10
      ) {
        nextIndex += 1;
      }
      while (nextIndex >= 0 && readingHead < markerOffsets[nextIndex] - 18) {
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

  return (
    <div
      className="relative m-0 pt-8 [--timeline-drawn-px:0px]
        [--timeline-length-px:0px] [--timeline-start-px:1rem]"
      ref={timelineRef}
    >
      <div className="mb-8 grid grid-cols-[2rem_minmax(0,1fr)] gap-4 md:gap-6">
        <h3
          className="m-0 font-serif text-3xl leading-none font-normal
            tracking-[0.04em] text-accent italic uppercase md:text-[1.65rem]"
        >
          Experience
        </h3>
      </div>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-(--timeline-start-px) left-[0.96875rem]
          z-0 h-(--timeline-length-px) w-px origin-top bg-line max-md:w-[1.25px]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-(--timeline-start-px) left-[0.96875rem]
          z-0 h-(--timeline-drawn-px) w-px origin-top bg-accent-soft shadow-route
          max-md:w-[1.25px]"
      />

      <ol aria-label="Experience timeline" className="m-0 flex list-none flex-col gap-16 p-0
        md:gap-20">
        {ABOUT_TIMELINE.map((entry, index) => {
          const state = getTimelineState(index, activeIndex);

          return (
            <li
              aria-current={state === 'active' ? 'step' : undefined}
              className="relative z-1 grid grid-cols-[2rem_minmax(0,1fr)] items-start
                gap-4 md:gap-6"
              data-state={state}
              key={entry.id}
            >
              <span
                className="block size-8"
                ref={(node) => {
                  markerRefs.current[index] = node;
                }}
              >
                <RippleMarker
                  hasContinuation={index === ABOUT_TIMELINE.length - 1}
                  isCurrent={entry.isCurrent}
                  isPulsing={Boolean(
                    entry.isCurrent && isOpen && isNowVisible && activeIndex >= 0,
                  )}
                  rippleCount={rippleCounts[index] ?? 0}
                  state={state}
                />
              </span>

              <article className="max-w-116 pt-1">
                <p className={ENTRY_META}>
                  {entry.category} · {entry.dateRange}
                </p>
                <h4
                  className="mt-3 mb-0 font-serif text-2xl leading-tight font-normal
                    text-text italic"
                >
                  {entry.title}
                </h4>
                {entry.role && (
                  <p
                    className="mt-2 mb-0 font-mono text-meta leading-relaxed tracking-role
                      text-muted uppercase"
                  >
                    {entry.role}
                  </p>
                )}
                <p
                  className="mt-4 mb-0 font-mono text-xs leading-summary
                    tracking-[0.025em] text-muted-soft"
                >
                  {entry.summary}
                </p>
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
