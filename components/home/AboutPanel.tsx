'use client';

import {useEffect, useRef, useState} from 'react';
import {ABOUT_CONTACT, ABOUT_TIMELINE} from '@/data/aboutTimeline';

type TimelineState = 'upcoming' | 'active' | 'passed';

interface AboutPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RippleMarkerProps {
  isContact?: boolean;
  isCurrent?: boolean;
  isPulsing?: boolean;
  isRippling: boolean;
  state: TimelineState;
}

const FOCUS_RING = `rounded-xs focus-visible:outline-1 focus-visible:outline-offset-4
  focus-visible:outline-accent`;

const ENTRY_TRANSITION = `transition-[opacity,filter,transform] duration-timeline ease-timeline
  motion-reduce:duration-0`;

const ENTRY_STATE: Record<TimelineState, string> = {
  upcoming: `translate-y-2 opacity-[var(--opacity-timeline-upcoming)] blur-timeline
    motion-reduce:translate-y-0 motion-reduce:blur-none`,
  active: 'translate-y-0 opacity-100 blur-none',
  passed: 'translate-y-0 opacity-[var(--opacity-timeline-passed)] blur-none',
};

const MARKER_STATE: Record<TimelineState, string> = {
  upcoming: 'border-dim bg-panel/96',
  active: 'border-accent bg-accent shadow-route-marker',
  passed: 'border-muted bg-muted',
};

const ENTRY_META = `m-0 font-mono text-label leading-[1.45] tracking-label text-muted-soft
  uppercase`;

const CONTACT_LINK = `flex min-h-[2.9rem] items-center justify-between gap-4 border-b border-line
  font-mono text-label leading-[1.45] tracking-role text-muted uppercase no-underline
  transition-[border-color,color] duration-interaction ease-out hover:border-line-hover
  hover:text-text ${FOCUS_RING}`;

function entryMotion(state: TimelineState, delay = 'delay-0') {
  return `${ENTRY_TRANSITION} ${ENTRY_STATE[state]} ${state === 'active' ? delay : 'delay-0'}`;
}

function RippleMarker({
  isContact = false,
  isCurrent = false,
  isPulsing = false,
  isRippling,
  state,
}: RippleMarkerProps) {
  const rippleOne = isContact ? 'animate-contact-ripple-one' : 'animate-route-ripple-one';
  const rippleTwo = isContact ? 'animate-contact-ripple-two' : 'animate-route-ripple-two';

  return (
    <span
      aria-hidden="true"
      className="relative grid size-8 place-items-center"
      data-contact={isContact || undefined}
      data-current={isCurrent || undefined}
      data-pulsing={isPulsing || undefined}
      data-rippling={isRippling || undefined}
      data-state={state}
    >
      <span
        className={`relative z-2 block rounded-full border transition-[border-color,background-color,box-shadow]
          duration-300 ease-out ${isContact ? 'size-[0.45rem]' : 'size-[0.32rem]'}
          ${MARKER_STATE[state]}`}
      />
      <span
        className={`pointer-events-none absolute z-1 size-2 rounded-full border-[0.75px]
          border-accent-soft opacity-0 motion-reduce:hidden motion-reduce:animate-none
          ${isRippling ? rippleOne : ''}`}
      />
      <span
        className={`pointer-events-none absolute z-1 size-2 rounded-full border-[0.75px]
          border-accent-soft opacity-0 motion-reduce:hidden motion-reduce:animate-none
          ${isRippling ? rippleTwo : ''}`}
      />
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

export function AboutPanel({isOpen, onClose}: AboutPanelProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const activeIndexRef = useRef(-1);
  const activatedIndexesRef = useRef(new Set<number>());
  const rippleTimersRef = useRef<number[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [ripplingIndexes, setRipplingIndexes] = useState<ReadonlySet<number>>(
    () => new Set(),
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
      if (activatedIndexesRef.current.has(index)) return;

      activatedIndexesRef.current.add(index);
      setRipplingIndexes((current) => new Set(current).add(index));

      const timer = window.setTimeout(() => {
        setRipplingIndexes((current) => {
          const next = new Set(current);
          next.delete(index);
          return next;
        });
      }, 1100);
      rippleTimersRef.current.push(timer);
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
      rippleTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      rippleTimersRef.current = [];
      setIsNowVisible(false);
    };
  }, [isOpen]);

  const contactIndex = ABOUT_TIMELINE.length;

  return (
    <div
      className="group/about relative h-full min-h-0 pt-20 sm:pt-24"
      data-at-end="false"
      data-at-start="true"
      ref={shellRef}
    >
      <div
        className="no-scrollbar h-full touch-pan-y overflow-x-hidden overflow-y-auto overscroll-contain"
        ref={scrollRef}
      >
        <header
          className="sticky top-0 z-20 grid min-h-20 grid-cols-[1fr_auto_var(--spacing-11)]
            items-center gap-2 bg-linear-to-b from-panel/96 to-panel/86 px-9 py-4
            backdrop-blur-md sm:px-11"
        >
          <h2 className="m-0 font-serif text-display leading-none font-normal text-text italic uppercase sm:text-5xl">
            About
          </h2>
          <a
            className={`inline-flex min-h-11 items-center gap-[0.45rem] font-mono text-label
              tracking-label text-accent-soft uppercase no-underline transition-colors
              duration-interaction ease-out hover:text-text ${FOCUS_RING}`}
            href={ABOUT_CONTACT.resume}
            rel="noreferrer"
            target="_blank"
          >
            Résumé <span aria-hidden="true">↗</span>
          </a>
          <button
            aria-label="Close about preview"
            className={`absolute top-0 right-9 grid size-11 cursor-pointer place-items-center
              border-0 bg-transparent p-0 font-mono text-xl text-dim transition-colors
              duration-interaction ease-out hover:text-text sm:right-11 ${FOCUS_RING}`}
            onClick={onClose}
            type="button"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </header>

        <div className="px-9 sm:px-11">
          <section
            aria-labelledby="about-intro-title"
            className="flex flex-col justify-center py-4"
          >
            <h3
              className="m-0 font-serif text-intro leading-[0.98] font-normal tracking-[0.02em]
                text-text italic"
              id="about-intro-title"
            >
              Song Qiaoyuchen
            </h3>
            <p
              className="mt-5 mb-0 font-mono text-meta leading-meta
                tracking-meta text-muted uppercase"
            >
              Computer Science + Mathematics · National University of Singapore
            </p>
            <p
              className="mt-[2.1rem] mb-0 font-mono text-intro-copy
                leading-intro-copy tracking-[0.035em] text-muted-soft"
            >
              I build software across systems, interfaces, and interactive graphics.
              Outside engineering, I work with visual art and explore places through cycling.
            </p>
          </section>

          <div
            className="relative m-0 pt-12
              [--timeline-drawn-px:0px] [--timeline-length-px:0px] [--timeline-start-px:1rem]"
            ref={timelineRef}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-(--timeline-start-px) left-[0.96875rem]
                z-0 w-px origin-top bg-line max-sm:w-[1.25px]
                h-(--timeline-length-px)"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-(--timeline-start-px) left-[0.96875rem]
                z-0 w-px origin-top bg-accent-soft shadow-route max-sm:w-[1.25px]
                h-(--timeline-drawn-px)"
            />

            <ol aria-label="Experience timeline" className="m-0 list-none p-0">
              {ABOUT_TIMELINE.map((entry, index) => {
                const state = getTimelineState(index, activeIndex);

                return (
                  <li
                    aria-current={state === 'active' ? 'step' : undefined}
                    className="relative z-1 grid min-h-[43svh] grid-cols-[2rem_minmax(0,1fr)]
                      items-start gap-5 max-sm:min-h-[48svh] sm:gap-[1.55rem]"
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
                        isCurrent={entry.isCurrent}
                        isPulsing={Boolean(
                          entry.isCurrent && isOpen && isNowVisible && activeIndex >= 0,
                        )}
                        isRippling={ripplingIndexes.has(index)}
                        state={state}
                      />
                    </span>

                    <article className="max-w-116 pt-[0.2rem]">
                      <p className={`${ENTRY_META} ${entryMotion(state)}`}>
                        {entry.category} · {entry.dateRange}
                      </p>
                      <h3
                        className={`mt-[0.9rem] mb-0 font-serif text-entry-title leading-[1.1]
                          font-normal text-text italic ${entryMotion(state, 'delay-80')}`}
                      >
                        {entry.title}
                      </h3>
                      {entry.role && (
                        <p
                          className={`mt-[0.65rem] mb-0 font-mono text-meta leading-[1.55]
                            tracking-role text-muted uppercase ${entryMotion(state, 'delay-80')}`}
                        >
                          {entry.role}
                        </p>
                      )}
                      <p
                        className={`mt-[1.1rem] mb-0 max-w-[43ch] font-mono text-summary
                          leading-summary tracking-[0.025em] text-muted-soft
                          ${entryMotion(state, 'delay-160')}`}
                      >
                        {entry.summary}
                      </p>
                    </article>
                  </li>
                );
              })}

              <li
                aria-current={activeIndex === contactIndex ? 'step' : undefined}
                className="relative z-1 grid min-h-[74svh] grid-cols-[2rem_minmax(0,1fr)]
                  items-start gap-5 max-sm:min-h-[78svh] sm:gap-[1.55rem]"
                data-state={getTimelineState(contactIndex, activeIndex)}
              >
                <span
                  className="block size-8"
                  ref={(node) => {
                    markerRefs.current[contactIndex] = node;
                  }}
                >
                  <RippleMarker
                    isContact
                    isRippling={ripplingIndexes.has(contactIndex)}
                    state={getTimelineState(contactIndex, activeIndex)}
                  />
                </span>

                <section
                  aria-labelledby="connect-title"
                  className="-mt-[0.35rem] max-w-116 border-t border-line
                    bg-linear-[135deg] from-surface-soft to-transparent to-72% p-4 pb-5"
                >
                  <p
                    className={`${ENTRY_META} ${entryMotion(getTimelineState(contactIndex, activeIndex))}`}
                  >
                    Final station
                  </p>
                  <h3
                    className={`mt-[0.9rem] mb-0 font-serif text-entry-title leading-[1.1]
                      font-normal tracking-role text-accent-soft italic uppercase
                      ${entryMotion(getTimelineState(contactIndex, activeIndex), 'delay-80')}`}
                    id="connect-title"
                  >
                    Connect
                  </h3>
                  <p
                    className={`mt-[1.1rem] mb-0 max-w-[43ch] font-mono text-summary
                      leading-summary tracking-[0.025em] text-muted-soft
                      ${entryMotion(getTimelineState(contactIndex, activeIndex), 'delay-80')}`}
                  >
                    For collaborations, questions, or a good route worth cycling.
                  </p>
                  <nav
                    aria-label="Contact links"
                    className={`mt-[1.7rem] grid border-t border-line
                      ${entryMotion(getTimelineState(contactIndex, activeIndex), 'delay-160')}`}
                  >
                    <a className={CONTACT_LINK} href={`mailto:${ABOUT_CONTACT.email}`}>
                      <span>Email</span>
                      <span className="text-micro tracking-[0.04em] text-accent-muted lowercase">
                        {ABOUT_CONTACT.email}
                      </span>
                    </a>
                    <a
                      className={CONTACT_LINK}
                      href={ABOUT_CONTACT.linkedIn}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span>LinkedIn</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                    <a
                      className={CONTACT_LINK}
                      href={ABOUT_CONTACT.gitHub}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span>GitHub</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                    <a
                      className={CONTACT_LINK}
                      href={ABOUT_CONTACT.resume}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span>View résumé</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  </nav>
                </section>
              </li>
            </ol>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-20
          bg-linear-to-b from-transparent to-panel/92 transition-opacity duration-220
          ease-out group-data-[at-end=true]/about:opacity-0 motion-reduce:duration-0"
      />
    </div>
  );
}
