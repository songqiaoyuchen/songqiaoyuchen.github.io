'use client';

import {ArtworkStack} from './ArtworkStack';

interface ArtPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const FOCUS_RING = `rounded-xs focus-visible:outline-1 focus-visible:outline-offset-4
  focus-visible:outline-accent`;

export function ArtPanel({isOpen, onClose}: ArtPanelProps) {
  return (
    <div className="relative h-full min-h-0">
      <button
        aria-label="Close art preview"
        className={`absolute right-6 top-28 z-30 grid size-11 cursor-pointer place-items-center
          border-0 bg-transparent p-0 font-mono text-xl font-light leading-none text-dim
          transition-colors duration-interaction ease-out hover:text-text sm:right-10 sm:top-24
          ${FOCUS_RING}`}
        onClick={onClose}
        tabIndex={isOpen ? 0 : -1}
        type="button"
      >
        <span aria-hidden="true">&times;</span>
      </button>

      <div
        aria-label="Art panel content"
        className="no-scrollbar h-full w-full max-w-none overflow-y-auto overscroll-contain
          px-6 pb-14 pt-28 sm:max-w-drawer sm:px-10"
        role="region"
        tabIndex={isOpen ? 0 : -1}
      >
        <div className="animate-drawer-content motion-reduce:animate-none">
          <header className="mb-6 pr-11">
            <h2 className="mb-4 font-serif text-display font-normal italic uppercase leading-none
              text-text sm:text-5xl">
              Art
            </h2>
            <p className="m-0 max-w-copy font-mono text-copy leading-copy text-muted">
              Paintings, drawings, and visual experiments.
            </p>
          </header>

          <ArtworkStack />
        </div>
      </div>
    </div>
  );
}
