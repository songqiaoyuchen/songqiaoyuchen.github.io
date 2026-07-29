'use client';

import {useEffect, useState, type TransitionEvent} from 'react';
import type {SectionId} from '@/config/navigation/linkStreams';
import type {ArticleSummary} from '@/lib/content/types';
import {AboutPanel} from './about/AboutPanel';
import {ArtPanel} from './art/ArtPanel';
import {BlogPanel} from './blog/BlogPanel';
import {ProjectsPanel} from './projects/ProjectsPanel';

const SECTION_LABELS: Record<SectionId, string> = {
  about: 'About',
  art: 'Art',
  blog: 'Blog',
  projects: 'Projects',
};

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

  const sectionLabel = SECTION_LABELS[displayedId];
  const isAbout = displayedId === 'about';
  const isArt = displayedId === 'art';
  const isBlog = displayedId === 'blog';

  return (
    <aside
      aria-hidden={activeId === null}
      aria-label={`${sectionLabel} preview`}
      className={`
        fixed inset-y-0 left-0 z-40 w-full md:w-drawer
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
          max-md:border-r-0 max-md:bg-panel/94 max-md:mask-none`}
      />

      <div className="relative z-10 h-full">
        {isAbout ? (
          <AboutPanel isOpen={activeId === 'about'} />
        ) : isArt ? (
          <ArtPanel isOpen={activeId === 'art'} />
        ) : isBlog ? (
          <BlogPanel articles={articles} isOpen={activeId === 'blog'} />
        ) : (
          <ProjectsPanel isOpen={activeId === 'projects'} />
        )}
      </div>

      <button
        aria-label={`Close ${sectionLabel.toLowerCase()} preview`}
        className="absolute right-6 top-20 z-50 grid size-11 place-items-center border-0 bg-transparent
          p-0 font-mono text-xl font-light leading-none text-dim transition-colors
          duration-interaction ease-out hover:text-text focus-visible:outline-1
          focus-visible:outline-offset-4 focus-visible:outline-accent md:right-0 md:top-24"
        onClick={onClose}
        tabIndex={activeId !== null ? 0 : -1}
        type="button"
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </aside>
  );
}
