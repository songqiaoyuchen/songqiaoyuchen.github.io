'use client';

import {useEffect, useState} from 'react';

interface ArtworkSectionNavProps {
  sections: readonly {
    id: string;
    label: string;
  }[];
}

export function ArtworkSectionNav({sections}: ArtworkSectionNavProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');

  useEffect(() => {
    const elements = sections
      .map(({id}) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleEntry) setActiveId(visibleEntry.target.id);
      },
      {
        rootMargin: '-18% 0px -58% 0px',
        threshold: [0, 0.1, 0.25, 0.5],
      },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      aria-label="Artwork sections"
      className="fixed inset-x-0 bottom-4 z-50 mx-auto w-[calc(100%-2rem)] max-w-max
        rounded-full border border-line bg-surface-strong p-1.5 shadow-2xl shadow-black/40
        backdrop-blur-xl sm:bottom-6"
    >
      <ul className="no-scrollbar m-0 flex max-w-[calc(100vw-3rem)] list-none gap-1 overflow-x-auto p-0">
        {sections.map((section, index) => {
          const isActive = activeId === section.id;

          return (
            <li className="shrink-0" key={section.id}>
              <a
                aria-current={isActive ? 'location' : undefined}
                className={`flex min-h-11 items-center rounded-full px-4 font-mono text-label
                  uppercase tracking-label transition-colors duration-interaction
                  focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent
                  ${isActive
                    ? 'bg-accent text-background'
                    : 'text-muted hover:bg-surface-hover hover:text-text'}`}
                href={`#${section.id}`}
                onClick={() => setActiveId(section.id)}
              >
                <span className="mr-2 text-[0.5rem] opacity-70" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
