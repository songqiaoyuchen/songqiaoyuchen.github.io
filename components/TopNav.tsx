'use client';

import { HOME_SECTIONS } from '@/data/homeSections';
import type { SectionId } from '@/data/homeSections';

type Props = {
  activeSection: SectionId | null;
  onSectionClick: (id: SectionId) => void;
};

export function TopNav({ activeSection, onSectionClick }: Props) {
  return (
    <nav
      className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between px-10 pt-7"
      aria-label="Site navigation"
    >
      <a
        href="/"
        className="font-mono text-[12px] uppercase tracking-[0.2em] text-muted  hover:text-accent transition-colors"
      >
        Solaris
      </a>

      <ul className="flex list-none gap-8 p-0 m-0">
        {HOME_SECTIONS.map((s) => (
          <li key={s.id}>
            <button
              className="border-0 bg-transparent px-0 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-accent transition-colors"
              onClick={() => onSectionClick(s.id)}
              aria-pressed={activeSection === s.id}
            >
              {s.label}
            </button>
          </li>
        ))}
        <li>
          <a
            href="/about"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-text"
          >
            About
          </a>
        </li>
      </ul>
    </nav>
  );
}
