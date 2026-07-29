'use client';

import Link from 'next/link';
import {useEffect, useState, type TransitionEvent} from 'react';
import {SECTIONS, type SectionId} from '@/data/sections';
import type {ArticleSummary} from '@/lib/content/types';
import {AboutPanel} from './about/AboutPanel';
import {ArtPanel} from './art/ArtPanel';
import {BlogPanel} from './blog/BlogPanel';
import {ProjectsPanel} from './projects/ProjectsPanel';

interface DrawerProps {
  activeId: SectionId | null;
  articles: readonly ArticleSummary[];
  onClose: () => void;
}

export function Drawer({activeId, articles, onClose}: DrawerProps) {
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
  const isArt = displayedId === 'art';
  const isBlog = displayedId === 'blog';
  const isProjects = displayedId === 'projects';
  const isEditorialPanel = isAbout || isArt || isBlog || isProjects;
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
          ${isEditorialPanel ? 'max-sm:border-r-0 max-sm:bg-panel/94 max-sm:mask-none' : ''}`}
      />

      <div className="relative z-10 h-full">
        {isAbout ? (
          <AboutPanel isOpen={activeId === 'about'} onClose={onClose} />
        ) : isArt ? (
          <ArtPanel isOpen={activeId === 'art'} onClose={onClose} />
        ) : isBlog ? (
          <BlogPanel articles={articles} isOpen={activeId === 'blog'} />
        ) : isProjects ? (
          <ProjectsPanel isOpen={activeId === 'projects'} onClose={onClose} />
        ) : (
          <div className="no-scrollbar flex h-full max-w-drawer flex-col overflow-y-auto
            px-6 pb-10 pt-24 sm:px-10 sm:pt-28">
            <button
              aria-label={`Close ${section.label.toLowerCase()} preview`}
              className="absolute right-6 top-20 z-20 grid size-11 place-items-center border-0
                bg-transparent p-0 font-mono text-xl font-light leading-none text-dim
                transition-colors hover:text-text focus-visible:outline-1
                focus-visible:outline-offset-4 focus-visible:outline-accent sm:right-10 sm:top-24"
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
