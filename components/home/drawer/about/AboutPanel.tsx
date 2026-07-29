'use client';

import {useRef} from 'react';
import {ABOUT_CONTACT} from '@/data/aboutTimeline';
import {ContactFooter} from './ContactFooter';
import {ExperienceTimeline} from './ExperienceTimeline';
import {PANEL_SCROLL_CLASS} from '../panelStyles';

interface AboutPanelProps {
  isOpen: boolean;
}

const FOCUS_RING = `rounded-xs focus-visible:outline-1 focus-visible:outline-offset-4
  focus-visible:outline-accent`;

export function AboutPanel({isOpen}: AboutPanelProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="group/about relative h-full min-h-0"
      data-at-end="false"
      data-at-start="true"
      ref={shellRef}
    >
      <div
        className={PANEL_SCROLL_CLASS}
        ref={scrollRef}
      >
        <div className="animate-drawer-content motion-reduce:animate-none">
          <header>
          <h2 className="mb-5 font-serif text-display font-normal italic uppercase leading-none
            text-text md:text-5xl">
            About
          </h2>
          <a
            className={`mb-4 inline-flex min-h-11 items-center gap-[0.45rem] font-mono text-label
              tracking-label text-accent-soft uppercase no-underline transition-colors
              duration-interaction ease-out hover:text-text ${FOCUS_RING}`}
            href={ABOUT_CONTACT.resume}
            rel="noreferrer"
            target="_blank"
          >
            Résumé
            <span aria-hidden="true" className="-translate-y-px translate-x-px">↗</span>
          </a>
        </header>

        <div>
          <section
            aria-labelledby="about-intro-title"
            className="flex flex-col justify-center pt-4 pb-2"
          >
            <h3
              className="m-0 -translate-x-[0.04em] font-serif text-3xl leading-[0.98]
                font-normal tracking-[0.02em] text-accent italic"
              id="about-intro-title"
            >
              Song Qiaoyuchen
            </h3>
            <p
              className="mt-4 mb-0 font-mono text-meta leading-meta tracking-meta
                text-muted uppercase"
            >
              Computer Science + Mathematics · National University of Singapore
            </p>
            <p
              className="mt-6 mb-0 font-mono text-intro-copy leading-intro-copy
                tracking-[0.035em] text-muted-soft"
            >
              I build software across systems, interfaces, and interactive graphics.
              Outside engineering, I work with visual art and explore places through cycling.
            </p>
          </section>

          <ExperienceTimeline isOpen={isOpen} scrollRef={scrollRef} shellRef={shellRef} />
          <ContactFooter />
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="about-bottom-reveal pointer-events-none absolute inset-x-0 bottom-0 z-30 h-40
          transition-opacity duration-220 ease-out group-data-[at-end=true]/about:opacity-0
          motion-reduce:duration-0"
      />
    </div>
  );
}
