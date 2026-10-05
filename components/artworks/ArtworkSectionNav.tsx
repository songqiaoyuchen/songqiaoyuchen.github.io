'use client';

import {useEffect} from 'react';
import {motion} from 'motion/react';
import {ARTWORK_SECTIONS, type ArtMedium} from '@/data/artworks';
import {useReducedMotion} from '@/hooks/useReducedMotion';

export function ArtworkSectionNav({activeMedium, onMediumChange}: {
  activeMedium: ArtMedium;
  onMediumChange: (medium: ArtMedium) => void;
}) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const sections = ARTWORK_SECTIONS.map(({id}) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);
    let frame: number | null = null;

    // Honor existing medium links once on collection entry. Inspection returns
    // keep the collection mounted and restore their own exact scroll position.
    if (window.location.pathname.replace(/\/+$/, '').endsWith('/all')) {
      const initialId = window.location.hash.slice(1) || new URLSearchParams(window.location.search).get('medium');
      sections.find(({id}) => id === initialId)?.scrollIntoView({behavior: 'instant'});
    }

    const update = () => {
      frame = null;
      const active = sections.reduce((current, section) =>
        section.getBoundingClientRect().top <= window.innerHeight * 0.3 ? section : current,
      sections[0]);
      if (active) onMediumChange(active.id as ArtMedium);
    };
    const scheduleUpdate = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };
    scheduleUpdate();
    window.addEventListener('scroll', scheduleUpdate, {passive: true});
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [onMediumChange]);

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
