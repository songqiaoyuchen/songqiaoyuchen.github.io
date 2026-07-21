'use client';

import { useEffect, useState, type AnimationEvent } from 'react';
import FadeContent from '@/components/FadeContent/FadeContent';
import { HOME_FOCUS_SECTION_LABELS, type HomeSection } from '@/data/homeFocusSections';
import styles from './PreviewDrawer.module.css';

type PreviewDrawerProps = {
  activeSection: HomeSection | null;
  onClose: () => void;
};

export function PreviewDrawer({ activeSection, onClose }: PreviewDrawerProps) {
  const isOpen = activeSection !== null;
  const [displayedSection, setDisplayedSection] = useState<HomeSection | null>(activeSection);
  const [isMaterialised, setIsMaterialised] = useState(isOpen);
  const sectionLabel = HOME_FOCUS_SECTION_LABELS[displayedSection ?? 'projects'];

  useEffect(() => {
    let transitionFrame: number;

    if (activeSection === displayedSection) {
      transitionFrame = window.requestAnimationFrame(() => {
        setIsMaterialised(activeSection !== null);
      });
    } else if (activeSection !== null) {
      transitionFrame = window.requestAnimationFrame(() => {
        setDisplayedSection(activeSection);
        setIsMaterialised(true);
      });
    } else {
      transitionFrame = window.requestAnimationFrame(() => {
        setIsMaterialised(false);
      });
    }

    return () => {
      window.cancelAnimationFrame(transitionFrame);
    };
  }, [activeSection, displayedSection]);

  function handleAnimationEnd(event: AnimationEvent<HTMLElement>) {
    if (
      event.target !== event.currentTarget ||
      !event.currentTarget.classList.contains(styles.closed) ||
      isMaterialised
    ) {
      return;
    }

    setDisplayedSection(activeSection);
    setIsMaterialised(activeSection !== null);
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (displayedSection === null) return null;

  return (
    <aside
      id="projects-preview"
      className={`${styles.previewFade} fixed inset-y-0 left-0 z-40 w-[min(100vw,clamp(340px,45vw,620px))] ${
        isMaterialised
          ? `${styles.open} pointer-events-auto`
          : `${styles.closed} pointer-events-none`
      }`}
      aria-label={`${sectionLabel} preview`}
      aria-hidden={!isMaterialised}
      onAnimationEnd={handleAnimationEnd}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, rgba(8, 10, 13, 0.94) 0%, rgba(8, 10, 13, 0.88) 72%, rgba(8, 10, 13, 0.2) 94%, rgba(8, 10, 13, 0) 100%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: '20px 0 60px rgba(0, 0, 0, 0.12)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          maskImage:
            'linear-gradient(to right, black 0%, black 78%, rgba(0, 0, 0, 0.9) 86%, rgba(0, 0, 0, 0.45) 94%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to right, black 0%, black 78%, rgba(0, 0, 0, 0.9) 86%, rgba(0, 0, 0, 0.45) 94%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      <div
        className={`${styles.scrollArea} relative z-10 flex h-full max-w-155 flex-col overflow-y-auto px-9 pb-10 pt-24 sm:px-11 sm:pt-28`}
      >
        <button
          type="button"
          onClick={onClose}
          tabIndex={isMaterialised ? 0 : -1}
          className="absolute right-9 top-20 z-20 grid size-9 place-items-center border-0 bg-transparent p-0 font-mono text-[20px] font-light leading-none text-dim transition-colors hover:text-text focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-accent sm:right-11 sm:top-24"
          aria-label={`Close ${sectionLabel.toLowerCase()} preview`}
        >
          <span aria-hidden="true">&times;</span>
        </button>

        <FadeContent
          key={displayedSection}
          blur
          duration={650}
          delay={100}
          ease="power2.out"
          initialOpacity={0}
        >
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
            Preview
          </p>
          <h2 className="mb-5 font-serif text-[42px] font-normal italic uppercase leading-none text-text sm:text-[48px]">
            {sectionLabel}
          </h2>
          <p className="mb-8 max-w-[60ch] font-mono text-[11px] leading-[1.8] text-muted">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante
            venenatis dapibus posuere velit aliquet.
          </p>

          <div className="space-y-3" aria-label={`${sectionLabel} previews`}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="group min-h-36 rounded-[14px] border border-[rgba(242,238,230,0.055)] bg-[rgba(255,255,255,0.025)] px-5 py-5 transition-colors hover:bg-[rgba(255,255,255,0.04)]">
                <p className="font-serif text-[21px] font-normal italic leading-snug text-text">
                  Lorem ipsum <span aria-hidden="true">&rarr;</span>
                </p>
                <p className="mt-2 font-mono text-[10px] leading-relaxed text-dim">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              </p>
            </div>))}
          </div>

          <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
            View all {sectionLabel.toLowerCase()} <span aria-hidden="true">&rarr;</span>
          </p>
        </FadeContent>
      </div>
    </aside>
  );
}
