'use client';

import Link from 'next/link';
import {useCallback, useEffect, useRef} from 'react';
import {FEATURED_PROJECTS} from '@/data/projects';
import {ProjectCard} from './ProjectCard';

interface ProjectsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const FOCUS_RING = `rounded-xs focus-visible:outline-1 focus-visible:outline-offset-4
  focus-visible:outline-accent`;

export function ProjectsPanel({isOpen, onClose}: ProjectsPanelProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const updateScrollState = useCallback(() => {
    const shell = shellRef.current;
    const scroll = scrollRef.current;
    if (!shell || !scroll) return;

    shell.dataset.atStart = String(scroll.scrollTop <= 1);
    shell.dataset.atEnd = String(
      scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop <= 1,
    );
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const frame = window.requestAnimationFrame(updateScrollState);
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, updateScrollState]);

  return (
    <div
      className="group/projects relative h-full min-h-0"
      data-at-end="false"
      data-at-start="true"
      ref={shellRef}
    >
      <button
        aria-label="Close projects preview"
        className={`absolute right-6 top-28 z-30 grid size-11 cursor-pointer place-items-center
          border-0 bg-transparent p-0 font-mono text-xl font-light leading-none text-dim
          transition-colors duration-interaction ease-out hover:text-text sm:right-10 sm:top-24
          ${FOCUS_RING}`}
        onClick={onClose}
        tabIndex={isOpen ? 0 : -1}
        type="button"
      >
        <span aria-hidden="true">&times;</span>
      </button>

      <div
        className="no-scrollbar h-full w-full max-w-none touch-pan-y overflow-x-hidden
          overflow-y-auto overscroll-contain px-6 pb-20 pt-32 sm:max-w-drawer sm:px-10 sm:pt-28"
        onScroll={updateScrollState}
        ref={scrollRef}
      >
        <div className="animate-drawer-content pr-11 motion-reduce:animate-none">
          <header className="mb-7">
            <h2 className="mb-5 font-serif text-display font-normal italic uppercase leading-none
              text-text sm:text-5xl">
              Projects
            </h2>
            <p className="m-0 max-w-copy font-mono text-copy leading-copy text-muted">
              Some of the stuff I've built. I'm always looking for the next interesting project to work on.
            </p>
          </header>

          <div aria-label="Featured projects" className="space-y-3">
            {FEATURED_PROJECTS.map((project, index) => (
              <ProjectCard index={index} key={project.id} project={project} />
            ))}
          </div>

          <Link
            className={`mt-7 inline-flex min-h-11 items-center font-mono text-label tracking-label
              text-accent uppercase transition-colors duration-interaction hover:text-text
              ${FOCUS_RING}`}
            href="/projects"
          >
            View all projects <span aria-hidden="true" className="ml-2">&rarr;</span>
          </Link>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="about-bottom-reveal pointer-events-none absolute inset-x-0 bottom-0 z-30 h-32
          transition-opacity duration-220 ease-out group-data-[at-end=true]/projects:opacity-0
          motion-reduce:duration-0"
      />
    </div>
  );
}
