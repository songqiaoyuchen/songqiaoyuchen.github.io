// About timeline: entries hung on a route line that draws itself as the panel scrolls (useTimelineProgress).
'use client';

import type {RefObject} from 'react';
import {ABOUT_TIMELINE, type TimelineEntry} from '@/data/about';
import {panelStyles} from '../Drawer.styles';
import {RippleMarker, type TimelineState} from './RippleMarker';
import {useTimelineProgress} from './useTimelineProgress';

interface ExperienceTimelineProps {
  isOpen: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  shellRef: RefObject<HTMLDivElement | null>;
}

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
  );
}

export function ExperienceTimeline({isOpen, scrollRef, shellRef}: ExperienceTimelineProps) {
  const {timelineRef, markerRefs, activeIndex, rippleCounts, isNowVisible} =
    useTimelineProgress(isOpen, shellRef, scrollRef);

  return (
    <div
      className="relative m-0 pt-8 [--timeline-drawn-px:0px]
        [--timeline-length-px:0px] [--timeline-start-px:1rem]"
      ref={timelineRef}
    >
      <div className="mb-8 grid grid-cols-[2rem_minmax(0,1fr)] gap-4 md:gap-6">
        <h3 className={`${panelStyles.sectionTitle} md:text-[1.65rem]`}>
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

              <TimelineEntryText entry={entry} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
