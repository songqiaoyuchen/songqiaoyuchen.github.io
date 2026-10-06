// About drawer panel: introduction, experience timeline and contact footer.
'use client';

import {useRef} from 'react';
import {ABOUT_CONTACT, ABOUT_INTRO} from '@/data/about';
import {panelStyles} from '../Drawer.styles';
import {ContactFooter} from './ContactFooter';
import {ExperienceTimeline} from './ExperienceTimeline';

interface AboutPanelProps {
  isOpen: boolean;
}

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
        className={panelStyles.scroll}
        ref={scrollRef}
      >
        <div className={panelStyles.content}>
          <header>
            <h2 className={panelStyles.title}>
              About
            </h2>
          </header>

          <div>
            <section
              aria-labelledby="about-intro-title"
              className="flex flex-col justify-center gap-4 sm:gap-6"
            >
              <h3
                className="m-0 -translate-x-[0.04em] font-serif text-3xl leading-[0.98]
                  font-normal tracking-[0.02em] text-accent italic"
                id="about-intro-title"
              >
                {ABOUT_INTRO.name}
              </h3>

              <a
                className={`items-center gap-[0.45rem] font-mono text-label
                  tracking-label text-accent-soft uppercase no-underline transition-colors
                  duration-interaction ease-out hover:text-text ${panelStyles.focusRing}`}
                href={ABOUT_CONTACT.resume}
                rel="noreferrer"
                target="_blank"
              >
                Résumé
                <span aria-hidden="true" className="-translate-y-px translate-x-px">↗</span>
              </a>

              <p
                className="font-mono text-meta leading-meta tracking-meta
                  text-muted uppercase"
              >
                {ABOUT_INTRO.studies}
              </p>
              <p
                className="font-mono text-intro-copy leading-intro-copy
                  tracking-[0.035em] text-muted-soft"
              >
                {ABOUT_INTRO.bio}
              </p>
            </section>

            {/* The timeline also maintains this panel's data-at-start/end edge flags. */}
            <ExperienceTimeline isOpen={isOpen} scrollRef={scrollRef} shellRef={shellRef} />
            <ContactFooter />
          </div>
        </div>
      </div>

    </div>
  );
}
