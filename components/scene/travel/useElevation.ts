// Loads the baked elevation map (scripts/assets/build-travel-geo.mjs) once: a texture for the globe shaders and a
// CPU sampler for placing markers on the relief. A missing file leaves the globe smooth.
'use client';

import {useEffect, useState} from 'react';
import {LinearFilter, RepeatWrapping, Texture, Vector2} from 'three';
import type {LonLat} from '@/data/travel';

export type Elevation = {
  texture: Texture;
  /** One texel in map coordinates. */
  texel: Vector2;
  /** Normalized height (0 sea, 1 the highest ground) at a place. */
  heightAt: (place: LonLat) => number;
};

let cached: Promise<Elevation | null> | null = null;

function loadElevation(src: string) {
  cached ??= new Promise<Elevation | null>((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', {willReadFrequently: true});
      if (!context) {
        resolve(null);
        return;
      }
      context.drawImage(image, 0, 0);
      const {data, width, height} = context.getImageData(0, 0, canvas.width, canvas.height);
      const texture = new Texture(image);
      texture.wrapS = RepeatWrapping;
      texture.minFilter = LinearFilter;
      texture.magFilter = LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
      resolve({
        texture,
        texel: new Vector2(1 / width, 1 / height),
        heightAt: ([lon, lat]) => {
          const column = Math.min(width - 1, Math.max(0, Math.round((lon + 180) / 360 * (width - 1))));
          const row = Math.min(height - 1, Math.max(0, Math.round((90 - lat) / 180 * (height - 1))));
          return data[(row * width + column) * 4] / 255;
        },
      });
    };
    image.onerror = () => resolve(null);
    image.src = src;
  });
  return cached;
}

export function useElevation(src: string) {
  const [elevation, setElevation] = useState<Elevation | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadElevation(src).then((loaded) => {
      if (!cancelled) setElevation(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);
  return elevation;
}
