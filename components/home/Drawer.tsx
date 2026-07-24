'use client';

import Link from 'next/link';
import {useEffect, useState, type TransitionEvent} from 'react';
import {SECTIONS, type SectionId} from '@/data/sections';
import {AboutPanel} from './AboutPanel';
import {DrawerPreviews} from './DrawerPreviews';

interface DrawerProps {
  activeId: SectionId | null;
  onClose: () => void;
}

export function Drawer({activeId, onClose}: DrawerProps) {
  const [displayedId, setDisplayedId] = useState<SectionId | null>(activeId);

  useEffect(() => {
    if (activeId === null) return;

    const frame = window.requestAnimationFrame(() => setDisplayedId(activeId));
    return () => window.cancelAnimationFrame(frame);
  }, [activeId]);

  useEffect(() => {
    if (activeId === null) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeId, onClose]);

  function handleTransitionEnd(event: TransitionEvent<HTMLElement>) {
    if (event.target === event.currentTarget && activeId === null) {
      setDisplayedId(null);
    }
  }

  if (displayedId === null) return null;

  const section = SECTIONS[displayedId];
  const isAbout = displayedId === 'about';
  return (
    <aside
      aria-hidden={activeId === null}
      aria-label={`${section.label} preview`}
      className={`
        fixed inset-y-0 left-0 z-40 w-full sm:w-drawer
        transition-[opacity,visibility] duration-100 motion-reduce:duration-0
        ${
          activeId !== null
            ? 'visible pointer-events-auto opacity-100'
            : 'invisible pointer-events-none opacity-0'
        }
      }`}
      id="section-preview"
      inert={activeId === null}
      onTransitionEnd={handleTransitionEnd}
    >
      <div
        aria-hidden="true"
        className={`preview-backdrop pointer-events-none absolute inset-0
          ${isAbout ? 'max-sm:border-r-0 max-sm:bg-panel/94 max-sm:mask-none' : ''}`}
      />

      <div className="relative z-10 h-full">
        {isAbout ? (
          <AboutPanel isOpen={activeId === 'about'} onClose={onClose} />
        ) : (
          <div className="no-scrollbar flex h-full max-w-drawer flex-col overflow-y-auto
            px-9 pb-10 pt-24 sm:px-11 sm:pt-28">
            <button
              aria-label={`Close ${section.label.toLowerCase()} preview`}
              className="absolute right-9 top-20 z-20 grid size-11 place-items-center border-0
                bg-transparent p-0 font-mono text-xl font-light leading-none text-dim
                transition-colors hover:text-text focus-visible:outline-1
                focus-visible:outline-offset-4 focus-visible:outline-accent sm:right-11 sm:top-24"
              onClick={onClose}
              tabIndex={activeId !== null ? 0 : -1}
              type="button"
            >
              <span aria-hidden="true">&times;</span>
            </button>

            <div
              className="animate-drawer-content motion-reduce:animate-none"
              key={displayedId}
            >
              <h2 className="mb-5 font-serif text-display font-normal italic uppercase leading-none
                text-text sm:text-5xl">
                {section.label}
              </h2>
              <p className="mb-8 max-w-copy font-mono text-copy leading-copy text-muted">
                {section.description}
              </p>

              <div aria-label={`${section.label} previews`} className="space-y-3">
                <DrawerPreviews sectionId={displayedId} />
              </div>

              <Link
                className="mt-8 inline-block min-h-11 font-mono text-label uppercase
                  tracking-label text-accent focus-visible:outline-1
                  focus-visible:outline-offset-4 focus-visible:outline-accent"
                href={section.href}
              >
                View all {section.label.toLowerCase()} <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
