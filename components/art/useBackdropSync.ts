// Tells the scene which backdrop to show. The gallery follows input immediately; the scene waits for
// browsing to pause (BACKDROP_CONFIG.settleSeconds) so passing through other media never starts their wipes.
'use client';

import {useEffect, useRef} from 'react';
import {BACKDROP_CONFIG} from '@/config/art/backdrop';
import type {ArtMedium} from '@/data/artworks';

export function useBackdropSync(medium: ArtMedium, setBackdrop: (medium: ArtMedium) => void) {
  const sceneBackdropSet = useRef(false);
  useEffect(() => {
    if (!sceneBackdropSet.current) {
      sceneBackdropSet.current = true;
      setBackdrop(medium);
      return;
    }
    const timer = window.setTimeout(() => setBackdrop(medium), BACKDROP_CONFIG.settleSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [medium, setBackdrop]);
}
