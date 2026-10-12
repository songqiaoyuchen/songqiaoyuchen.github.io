// Scroll spy for All works: reports the medium section under the top 30% of the viewport, and on entry
// jumps to the section named by #hash or ?medium=.
'use client';

import {useEffect} from 'react';
import {ARTWORK_SECTIONS, type ArtMedium} from '@/data/artworks';

// A section becomes active once its top passes this share of the viewport height.
const ACTIVE_LINE = 0.3;

export function useActiveMedium(onMediumChange: (medium: ArtMedium) => void) {
  useEffect(() => {
    const sections = ARTWORK_SECTIONS.map(({id}) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);
    let frame: number | null = null;
    let reported: string | null = null;

    // Honor existing medium links once on collection entry. Inspection returns
    // keep the collection mounted and restore their own exact scroll position.
    if (window.location.pathname.replace(/\/+$/, '').endsWith('/all')) {
      const initialId = window.location.hash.slice(1) || new URLSearchParams(window.location.search).get('medium');
      sections.find(({id}) => id === initialId)?.scrollIntoView({behavior: 'instant'});
    }

    const update = () => {
      frame = null;
      const active = sections.reduce((current, section) =>
        section.getBoundingClientRect().top <= window.innerHeight * ACTIVE_LINE ? section : current,
      sections[0]);
      // Only a change is reported: the parent sets state on each call.
      if (active && active.id !== reported) {
        reported = active.id;
        onMediumChange(active.id as ArtMedium);
      }
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
}
