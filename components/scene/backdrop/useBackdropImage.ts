// Loads and GPU-uploads a painted backdrop image once requested (at idle after the intro, or on Art entry),
// then keeps it for later visits. Decoded off the main thread as an ImageBitmap, so neither the decode nor the
// upload of the bitmap lands inside a camera journey's frame.
'use client';

import {useEffect, useState} from 'react';
import {useThree} from '@react-three/fiber';
import {ImageBitmapLoader, SRGBColorSpace, Texture} from 'three';

/** Prepare images once `active` first turns true and retain them across subsequent selections. */
export function useBackdropImage(active: boolean, imageUrl: string, medium: 'oil' | 'pencil') {
  const gl = useThree((state) => state.gl);
  const [requested, setRequested] = useState(active);
  const [texture, setTexture] = useState<Texture | null>(null);
  if (active && !requested) setRequested(true);
  useEffect(() => {
    if (!requested) return;
    let cancelled = false;
    let loaded: Texture | null = null;
    // A bitmap ignores Texture.flipY and premultiplyAlpha; the equivalent choices are made at creation.
    const loader = new ImageBitmapLoader().setOptions({imageOrientation: 'flipY', premultiplyAlpha: 'none'});
    loader.load(imageUrl, (bitmap) => {
      if (cancelled) {
        bitmap.close();
        return;
      }
      loaded = new Texture(bitmap);
      loaded.flipY = false;
      loaded.colorSpace = SRGBColorSpace;
      loaded.name = `Art.${medium}Illustration`;
      loaded.anisotropy = 8;
      loaded.needsUpdate = true;
      // Upload now so selecting this medium does not pay the first-use GPU cost.
      gl.initTexture(loaded);
      setTexture(loaded);
    }, undefined, () => console.warn(`${medium} backdrop image unavailable; keeping the previous backdrop.`));
    return () => {
      cancelled = true;
      if (loaded) {
        loaded.dispose();
        (loaded.image as ImageBitmap).close();
      }
    };
  }, [requested, imageUrl, medium, gl]);
  return texture;
}
