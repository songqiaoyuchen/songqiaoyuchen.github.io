'use client';

import {useEffect, useState} from 'react';
import {SRGBColorSpace, TextureLoader, type Texture} from 'three';

/** Load each image once on first use; keep it available as an outgoing style. */
export function useIllustrationTexture(active: boolean, imageUrl: string, medium: 'oil' | 'pencil') {
  const [requested, setRequested] = useState(active);
  const [texture, setTexture] = useState<Texture | null>(null);
  if (active && !requested) setRequested(true);
  useEffect(() => {
    if (!requested) return;
    let cancelled = false;
    const image = new TextureLoader().load(imageUrl, (loaded) => {
      if (cancelled) return;
      loaded.colorSpace = SRGBColorSpace;
      loaded.name = `Art.${medium}Illustration`;
      loaded.anisotropy = 8;
      loaded.needsUpdate = true;
      setTexture(loaded);
    }, undefined, () => console.warn(`${medium} illustration unavailable; retaining previous terrain treatment.`));
    return () => { cancelled = true; image.dispose(); };
  }, [requested, imageUrl, medium]);
  return texture;
}
