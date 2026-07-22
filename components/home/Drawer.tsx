'use client';

import Link from 'next/link';
import {useEffect, useState, type TransitionEvent} from 'react';
import {SECTIONS, type SectionId} from '@/data/sections';

interface DrawerProps {
  activeId: SectionId | null;
  onClose: () => void;
}

export function Drawer({activeId, onClose}: DrawerProps) {
  const [displayedId, setDisplayedId] = useState<SectionId | null>(activeId);
  // ??? i dont get the point of this isVisible state, why not use displayedId !== null? or activeid != null?
  // this issue i think arise from a duplicate variable, active id and displayed id, they are the same, just for different scopes,
  // making activeid global state is much cleaner i believe
  const [isVisible, setIsVisible] = useState(activeId !== null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (activeId !== null) setDisplayedId(activeId);
      setIsVisible(activeId !== null);
    });
    return () => window.cancelAnimationFrame(frame); // ??? what is cancelAnimationFrame doing here? is it necessary?
  }, [activeId]);

  useEffect(() => {
    if (!isVisible) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onClose]);

  // ??? this function is essentially onclose? all it does is set id to null so i do not render drawer
  // but this runs on every transition end, is this good pattern? why not handle explicitly onclose
  function handleTransitionEnd(event: TransitionEvent<HTMLElement>) {
    if (event.target === event.currentTarget && !isVisible && activeId === null) {
      setDisplayedId(null);
    }
  }

  if (displayedId === null) return null;

  const section = SECTIONS[displayedId];
  return (
    <aside
      aria-hidden={!isVisible}
      aria-label={`${section.label} preview`}
      className={`
        fixed inset-y-0 left-0 z-40 w-[min(100vw,clamp(340px,45vw,620px))]
        transition-[opacity,visibility] duration-100 motion-reduce:duration-0
        ${
          isVisible
            ? 'visible pointer-events-auto opacity-100'
            : 'invisible pointer-events-none opacity-0'
        }
      }`}
      id="section-preview"
      onTransitionEnd={handleTransitionEnd}
    >
      <div
        aria-hidden="true"
        className="preview-backdrop pointer-events-none absolute inset-0"
      />

      <div className="no-scrollbar relative z-10 flex h-full max-w-155 flex-col
        overflow-y-auto px-9 pb-10 pt-24 sm:px-11 sm:pt-28">
        <button
          aria-label={`Close ${section.label.toLowerCase()} preview`}
          className="absolute right-9 top-20 z-20 grid size-11 place-items-center border-0
            bg-transparent p-0 font-mono text-xl font-light leading-none text-dim
            transition-colors hover:text-text focus-visible:outline-1
            focus-visible:outline-offset-4 focus-visible:outline-accent sm:right-11 sm:top-24"
          onClick={onClose}
          tabIndex={isVisible ? 0 : -1}
          type="button"
        >
          <span aria-hidden="true">&times;</span>
        </button>

        <div
          className="animate-fade-in [animation-delay:100ms] [animation-duration:650ms]
            motion-reduce:animate-none"
          key={displayedId}
        >
          <h2 className="mb-5 font-serif text-[42px] font-normal italic uppercase leading-none
            text-text sm:text-5xl">
            {section.label}
          </h2>
          <p className="mb-8 max-w-[60ch] font-mono text-[11px] leading-[1.8] text-muted">
            {section.preview.description}
          </p>

          <div aria-label={`${section.label} previews`} className="space-y-3">
            {section.preview.items.map((item) => (
              <div
                className="group min-h-36 rounded-[14px] border border-white/5
                  bg-white/2.5 px-5 py-5 transition-colors hover:bg-white/4"
                key={item}
              >
                <p className="font-serif text-[21px] font-normal italic leading-snug text-text">
                  {item} <span aria-hidden="true">&rarr;</span>
                </p>
              </div>
            ))}
          </div>

          <Link
            className="mt-8 inline-block min-h-11 font-mono text-[10px] uppercase
              tracking-[0.14em] text-accent focus-visible:outline-1
              focus-visible:outline-offset-4 focus-visible:outline-accent"
            href={section.href}
          >
            View all {section.label.toLowerCase()} <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
