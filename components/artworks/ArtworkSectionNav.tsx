'use client';

import {useEffect, useState} from 'react';
import {motion} from 'motion/react';
import {useReducedMotion} from '@/hooks/useReducedMotion';

const ACTIVE_SECTION_VIEWPORT_RATIO = 0.3;

interface ArtworkSectionNavProps {
  sections: readonly {
    id: string;
    label: string;
  }[];
}

export function ArtworkSectionNav({sections}: ArtworkSectionNavProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');
  const isReducedMotion = useReducedMotion();

  useEffect(() => {
    const elements = sections
      .map(({id}) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) return;

    let animationFrameId: number | null = null;

    const updateActiveSection = () => {
      animationFrameId = null;
      const activationLine = window.innerHeight * ACTIVE_SECTION_VIEWPORT_RATIO;
      const activeElement = elements.reduce((active, element) =>
        element.getBoundingClientRect().top <= activationLine ? element : active,
      );

      setActiveId((currentId) =>
        currentId === activeElement.id ? currentId : activeElement.id,
      );
    };

    const scheduleUpdate = () => {
      if (animationFrameId !== null) return;
      animationFrameId = window.requestAnimationFrame(updateActiveSection);
    };

    scheduleUpdate();
    window.addEventListener('scroll', scheduleUpdate, {passive: true});
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
    };
  }, [sections]);

  return (
    <nav
      aria-label="Artwork sections"
      className="fixed inset-x-0 bottom-4 z-50 mx-auto w-[calc(100%-2rem)] max-w-max
        rounded-full border border-line bg-surface-strong p-1.5 shadow-2xl shadow-black/40
        backdrop-blur-xl sm:bottom-6"
    >
      <ul className="no-scrollbar m-0 flex max-w-[calc(100vw-3rem)] list-none gap-1 overflow-x-auto p-0">
        {sections.map((section) => {
          const isActive = activeId === section.id;

          return (
            <li className="shrink-0" key={section.id}>
              <a
                aria-current={isActive ? 'location' : undefined}
                className={`relative isolate flex min-h-11 items-center rounded-full px-4 font-mono text-label
                  uppercase tracking-label transition-colors duration-interaction
                  focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent
                  ${isActive
                    ? 'text-background'
                    : 'text-muted hover:bg-surface-hover hover:text-text'}`}
                href={`#${section.id}`}
                onClick={() => setActiveId(section.id)}
              >
                {isActive && (
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-accent"
                    layoutId="artwork-section-nav-active-pill"
                    transition={isReducedMotion
                      ? {duration: 0}
                      : {duration: 0.32, ease: [0.2, 0.75, 0.2, 1]}}
                  />
                )}
                <span>{section.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
