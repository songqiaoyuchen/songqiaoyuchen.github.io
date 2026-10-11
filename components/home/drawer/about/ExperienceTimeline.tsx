// About timeline: entries, oldest first, hung on a route line that draws itself as the panel scrolls
// (useTimelineProgress), ending at "Next?". The stop it settles on drives the terrain path's camera.
'use client';

import {useEffect, type MutableRefObject, type RefObject} from 'react';
import {ABOUT_PATH_CONFIG} from '@/config/scene/aboutPath';
import {ABOUT_TIMELINE, formatEntryStart, type TimelineEntry} from '@/data/about';
import {panelStyles} from '../Drawer.styles';
import {RippleMarker, type TimelineState} from './RippleMarker';
import {
  TIMELINE_STOP_COUNT,
  useTimelineProgress,
  type AboutScrollRequest,
} from './useTimelineProgress';

interface ExperienceTimelineProps {
  isOpen: boolean;
  onStopChange: (stop: number) => void;
  progressRef: MutableRefObject<number>;
  scrollRef: RefObject<HTMLDivElement | null>;
  scrollRequest: AboutScrollRequest | null;
  shellRef: RefObject<HTMLDivElement | null>;
}

const NEXT_STOP = TIMELINE_STOP_COUNT - 1;

const ENTRY_META = `m-0 font-mono text-label leading-[1.45] tracking-label text-muted-soft
  uppercase`;

// Route line track and its drawn part, both spanning first to last marker.
const ROUTE_LINE = `pointer-events-none absolute top-(--timeline-start-px) left-[0.96875rem]
  z-0 w-px origin-top max-md:w-[1.25px]`;

function getTimelineState(index: number, activeIndex: number): TimelineState {
  if (index === activeIndex) return 'active';
  if (index < activeIndex) return 'passed';
  return 'upcoming';
}

function TimelineEntryText({entry}: {entry: TimelineEntry}) {
  return (
    <article className="max-w-116 pt-1">
      <p className={ENTRY_META}>
        {entry.category} · <time dateTime={entry.start}>{formatEntryStart(entry.start)}</time>
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
  );
}

export function ExperienceTimeline({
  isOpen, onStopChange, progressRef, scrollRef, scrollRequest, shellRef,
}: ExperienceTimelineProps) {
  const {timelineRef, markerRef, activeIndex, rippleCounts, isNowVisible, scrollToStopRef} =
    useTimelineProgress(isOpen, shellRef, scrollRef, progressRef);
  const nextState = getTimelineState(NEXT_STOP, activeIndex);

  // The camera follows only once the reading head rests on a stop, not every entry scrolled past.
  useEffect(() => {
    const timeout = window.setTimeout(
      () => onStopChange(activeIndex),
      activeIndex < 0 ? 0 : ABOUT_PATH_CONFIG.settleMs,
    );
    return () => window.clearTimeout(timeout);
  }, [activeIndex, onStopChange]);

  useEffect(() => {
    if (scrollRequest) scrollToStopRef.current(scrollRequest.stop);
  }, [scrollRequest, scrollToStopRef]);

  return (
    <div
      className="relative m-0 pt-8 [--timeline-drawn-px:0px]
        [--timeline-length-px:0px] [--timeline-start-px:1rem]"
      ref={timelineRef}
    >
      <div className="mb-8 grid grid-cols-[2rem_minmax(0,1fr)] gap-4 md:gap-6">
        {/* Phones: a small label, the entries carry the page. */}
        <h3 className={`${panelStyles.sectionTitle} md:text-[1.65rem] max-md:col-span-2 max-md:font-mono
          max-md:text-label max-md:not-italic max-md:tracking-label max-md:text-dim`}>
          Experience
        </h3>
      </div>

      <span aria-hidden="true" className={`${ROUTE_LINE} h-(--timeline-length-px) bg-line`} />
      <span
        aria-hidden="true"
        className={`${ROUTE_LINE} h-(--timeline-drawn-px) bg-accent-soft shadow-route`}
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
                ref={markerRef(index)}
              >
                <RippleMarker
                  isCurrent={entry.isCurrent}
                  isPulsing={Boolean(
                    entry.isCurrent && isOpen && isNowVisible && activeIndex >= index,
                  )}
                  rippleCount={rippleCounts[index] ?? 0}
                  state={state}
                />
              </span>

              <TimelineEntryText entry={entry} />
            </li>
          );
        })}
      </ol>

      {/* The open end of the route, answered by the Connect footer below. */}
      <div
        className="relative z-1 mt-16 grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-4
          md:mt-20 md:gap-6"
        data-state={nextState}
      >
        <span
          className="block size-8"
          ref={markerRef(NEXT_STOP)}
        >
          <RippleMarker isOpenEnd rippleCount={rippleCounts[NEXT_STOP] ?? 0} state={nextState} />
        </span>
        <p className="m-0 font-serif text-2xl leading-tight font-normal text-text italic">
          Next?
        </p>
      </div>
    </div>
  );
}
