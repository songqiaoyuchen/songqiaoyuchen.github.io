'use client';

import Link from 'next/link';
import {useCallback, useEffect, useRef} from 'react';
import {FEATURED_PROJECTS} from '@/data/projects';
import {ProjectCard} from './ProjectCard';
import {PANEL_SCROLL_CLASS} from '../panelStyles';

interface ProjectsPanelProps {
  isOpen: boolean;
}

const FOCUS_RING = `rounded-xs focus-visible:outline-1 focus-visible:outline-offset-4
  focus-visible:outline-accent`;

export function ProjectsPanel({isOpen}: ProjectsPanelProps) {
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
      <div
        className={PANEL_SCROLL_CLASS}
        onScroll={updateScrollState}
        ref={scrollRef}
      >
        <div className="animate-drawer-content motion-reduce:animate-none">
          <header className="mb-7">
            <h2 className="mb-5 font-serif text-display font-normal italic uppercase leading-none
              text-text md:text-5xl">
              Projects
            </h2>
            <p className="m-0 max-w-copy font-mono text-copy leading-copy text-muted">
              Some of the stuff I&apos;ve built; Always looking for the next interesting
              project to work on.
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

    </div>
  );
}
