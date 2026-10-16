// Loads the baked ground around the landing place (scripts/assets/build-places-geo.mjs `region`) once: the
// elevation tile as a texture plus its description. Missing files leave the zoom-out without the regional ground.
'use client';

import {useEffect, useState} from 'react';
import {LinearFilter, LinearMipmapLinearFilter, Texture} from 'three';

export type RegionMeta = {
  lon: number;
  lat: number;
  /** Width of the tile on the ground. */
  km: number;
  size: number;
  /** Metres at a pixel value of 255. */
  maxMetres: number;
  /** Elevation of the landing place itself. */
  anchorMetres: number;
};

export type Region = {texture: Texture; meta: RegionMeta};

let cached: Promise<Region | null> | null = null;

function loadRegion(src: string, metaSrc: string) {
  cached ??= fetch(metaSrc)
    .then((response) => (response.ok ? response.json() as Promise<RegionMeta> : null))
    .then((meta) => new Promise<Region | null>((resolve) => {
      if (!meta) {
        resolve(null);
        return;
      }
      const image = new Image();
      image.onload = () => {
        const texture = new Texture(image);
        // Mipmapped: the shaders read the tile ever more coarsely toward its edge (landShading.glsl).
        texture.minFilter = LinearMipmapLinearFilter;
        texture.magFilter = LinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
        resolve({texture, meta});
      };
      image.onerror = () => resolve(null);
      image.src = src;
    }))
    .catch(() => null);
  return cached;
}

export function useRegion(src: string, metaSrc: string) {
  const [region, setRegion] = useState<Region | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadRegion(src, metaSrc).then((loaded) => {
      if (!cancelled) setRegion(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [metaSrc, src]);
  return region;
}
