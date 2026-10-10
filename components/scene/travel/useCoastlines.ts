// Loads the baked coastlines (scripts/assets/build-travel-geo.mjs) once; a missing file leaves the globe bare.
'use client';

import {useEffect, useState} from 'react';
import {decodeLines} from '@/lib/scene/travel';

let cached: Promise<Float32Array | null> | null = null;

function loadCoastlines(src: string) {
  cached ??= fetch(src)
    .then((response) => (response.ok ? response.arrayBuffer() : null))
    .then((buffer) => (buffer ? decodeLines(new Int16Array(buffer)) : null))
    .catch(() => null);
  return cached;
}

/** Unit-sphere LineSegments positions of the coastlines, or null while loading or when there are none. */
export function useCoastlines(src: string) {
  const [positions, setPositions] = useState<Float32Array | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadCoastlines(src).then((loaded) => {
      if (!cancelled) setPositions(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);
  return positions;
}
