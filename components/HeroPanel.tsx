'use client';

import { HOME_SECTIONS } from '@/data/homeSections';
import type { SectionId } from '@/data/homeSections';

type Props = {
  activeSection: SectionId | null;
};

export function HeroPanel({ activeSection }: Props) {
  const section = activeSection
    ? (HOME_SECTIONS.find((s) => s.id === activeSection) ?? null)
    : null;

  return (
    <div
      className="absolute left-1/2 top-1/2 z-40 w-[min(340px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 border border-line bg-surface px-6 py-7 backdrop-blur-[14px]"
      role="region"
      aria-label={section ? `${section.label} overview` : 'Introduction'}
    >
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(232,199,122,0.30)] bg-accent-dim font-mono text-[13px] tracking-[0.04em] text-accent" aria-hidden="true">
        S
      </div>

      <h1 className="mb-2.5 font-serif text-[26px] font-normal italic leading-[1.2] text-text">
        Hello, I&apos;m Sophon.
      </h1>

      {section ? (
        <div className="mt-3">
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-accent">
            {section.subtitle}
          </p>
          <h2 className="mb-3.5 font-serif text-[30px] font-normal italic leading-[1.1] text-text">
            {section.label}
          </h2>
          <p className="mb-3 font-mono text-[11px] leading-[1.75] text-muted">
            {section.preview.description}
          </p>
          <a
            href={section.href}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent"
          >
            View {section.label.toLowerCase()}
          </a>
        </div>
      ) : null}
    </div>
  );
}
