'use client';

import {ArtworkStack} from './ArtworkStack';
import {PANEL_SCROLL_CLASS} from '../panelStyles';

interface ArtPanelProps {
  isOpen: boolean;
}

export function ArtPanel({isOpen}: ArtPanelProps) {
  return (
    <div className="relative h-full min-h-0">
      <div
        aria-label="Art panel content"
        className={PANEL_SCROLL_CLASS}
        role="region"
        tabIndex={isOpen ? 0 : -1}
      >
        <div className="animate-drawer-content motion-reduce:animate-none">
          <header className="mb-6">
            <h2 className="mb-4 font-serif text-display font-normal italic uppercase leading-none
              text-text md:text-5xl">
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
