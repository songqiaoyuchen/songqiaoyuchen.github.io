// Fixed bottom bar on All works: jumps between medium sections and slides a pill to the current one.
'use client';

import {motion} from 'motion/react';
import {ARTWORK_SECTIONS, type ArtMedium} from '@/data/artworks';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {useActiveMedium} from './useActiveMedium';

export function MediumNav({activeMedium, onMediumChange}: {
  activeMedium: ArtMedium;
  onMediumChange: (medium: ArtMedium) => void;
}) {
  const reducedMotion = useReducedMotion();
  useActiveMedium(onMediumChange);

  return (
    <nav className="art-medium-nav" aria-label="Artwork sections">
      {ARTWORK_SECTIONS.map(({id, label, artworks}) => (
        <a className="art-medium-link" key={id} href={`#${id}`}
          aria-current={activeMedium === id ? 'location' : undefined}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            const url = new URL(window.location.href);
            url.searchParams.set('medium', id);
            url.hash = id;
            window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
            document.getElementById(id)?.scrollIntoView({behavior: reducedMotion ? 'instant' : 'smooth'});
          }}>
          {activeMedium === id && (
            <motion.span className="art-medium-pill" aria-hidden="true"
              layoutId="artwork-section-nav-active-pill"
              transition={reducedMotion ? {duration: 0} : {duration: 0.32, ease: [0.2, 0.75, 0.2, 1]}} />
          )}
          {label} <span className="art-medium-count">{artworks.length}</span>
        </a>
      ))}
    </nav>
  );
}
