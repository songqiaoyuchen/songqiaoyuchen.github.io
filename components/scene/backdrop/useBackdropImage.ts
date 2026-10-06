// Loads and GPU-uploads a painted backdrop image on Art entry, then keeps it for later visits.
'use client';

import {useEffect, useState} from 'react';
import {useThree} from '@react-three/fiber';
import {SRGBColorSpace, TextureLoader, type Texture} from 'three';

/** Prepare images on Art entry and retain them across subsequent selections. */
export function useBackdropImage(active: boolean, imageUrl: string, medium: 'oil' | 'pencil') {
  const gl = useThree((state) => state.gl);
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
      // Upload now so selecting this medium does not pay the first-use GPU cost.
      gl.initTexture(loaded);
      setTexture(loaded);
    }, undefined, () => console.warn(`${medium} backdrop image unavailable; keeping the previous backdrop.`));
    return () => { cancelled = true; image.dispose(); };
  }, [requested, imageUrl, medium, gl]);
  return texture;
}
