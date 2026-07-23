'use client';

import Link from 'next/link';
import {NAV_SECTIONS, type SectionId} from '@/data/sections';

interface NavProps {
  activeId: SectionId | null;
  onSectionClick: (id: SectionId) => void;
}

export function Nav({activeId, onSectionClick}: NavProps) {
  return (
    <nav
      aria-label="Site navigation"
      className="top-nav-glass absolute inset-x-0 top-0 z-50 flex flex-wrap items-center
        justify-between gap-y-1 px-6 pt-6 sm:flex-nowrap sm:px-10 sm:pt-7"
    >
      <Link
        className="flex min-h-11 items-center font-mono text-base uppercase tracking-brand
          text-muted transition-colors hover:text-accent focus-visible:outline-1
          focus-visible:outline-offset-4 focus-visible:outline-accent"
        href="/"
      >
        SQYC
      </Link>

      <ul
        className="m-0 flex w-full list-none justify-between gap-0 p-0 sm:w-auto sm:gap-8"
      >
        {NAV_SECTIONS.map((section) => (
          <li key={section.id}>
            <button
              aria-pressed={activeId === section.id}
              className="min-h-11 min-w-11 border-0 bg-transparent px-0 py-1 font-mono text-sm
                uppercase tracking-label text-muted transition-colors hover:text-accent
                focus-visible:outline-1 focus-visible:outline-offset-4
                focus-visible:outline-accent"
              onClick={() => onSectionClick(section.id)}
              type="button"
            >
              {section.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
