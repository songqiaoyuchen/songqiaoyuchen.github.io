'use client';

import Link from 'next/link';
import { HOME_SECTIONS } from '@/data/homeSections';
import type { SectionId } from '@/data/homeSections';

type Props = {
  activeSection: SectionId | null;
  onSectionClick: (id: SectionId) => void;
};

export function TopNav({ activeSection, onSectionClick }: Props) {
  return (
    <nav
      className="fixed left-0 right-0 top-0 z-50 flex items-start justify-between gap-5 px-5 pt-5 md:items-center md:px-10 md:pt-7"
      aria-label="Site navigation"
    >
      <Link
        href="/"
        className="font-mono text-[12px] uppercase tracking-[0.2em] text-muted hover:text-accent transition-colors"
      >
        Solaris
      </Link>

      <ul className="m-0 flex max-w-[250px] list-none flex-wrap justify-end gap-x-4 gap-y-2 p-0 md:max-w-none md:flex-nowrap md:gap-8">
        {HOME_SECTIONS.map((s) => (
          <li key={s.id}>
            <button
              className="border-0 bg-transparent px-0 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-accent md:text-[11px] md:tracking-[0.14em]"
              onClick={() => onSectionClick(s.id)}
              aria-pressed={activeSection === s.id}
            >
              {s.label}
            </button>
          </li>
        ))}
        <li>
          <Link
            href="/about"
            className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-text md:text-[11px] md:tracking-[0.14em]"
          >
            About
          </Link>
        </li>
      </ul>
    </nav>
  );
}
