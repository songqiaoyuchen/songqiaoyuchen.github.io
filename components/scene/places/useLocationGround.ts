// Loads a location's own ground (scripts/assets/build-places-geo.mjs `ground`) when the location first opens, then
// keeps it: the heights as a half-float texture in the elevation map's units, its mip levels built here (the GPU cannot
// build them for every half-float format), plus its description. A location without one, or a missing file, leaves the
// globe on its global map.
'use client';

import {useEffect, useState} from 'react';
import {
  ClampToEdgeWrapping, DataTexture, DataUtils, HalfFloatType, LinearFilter, LinearMipmapLinearFilter, RedFormat,
} from 'three';
import {PLACES_CONFIG} from '@/config/scene/places';

export type LocationGroundMeta = {
  lon: number;
  lat: number;
  /** Width of the tile on the ground. */
  km: number;
  size: number;
  /** Metres per level of the two-byte height. */
  stepMetres: number;
};

export type LocationGround = {id: string; texture: DataTexture; meta: LocationGroundMeta};

const cache = new Map<string, Promise<LocationGround | null>>();

/** A level half the size (odd sizes round down), each texel the mean of the 2 x 2 it covers. */
function halve(data: Float32Array, size: number) {
  const next = Math.max(1, Math.floor(size / 2));
  const out = new Float32Array(next * next);
  for (let y = 0; y < next; y++) {
    const y0 = Math.min(size - 1, y * 2);
    const y1 = Math.min(size - 1, y * 2 + 1);
    for (let x = 0; x < next; x++) {
      const x0 = Math.min(size - 1, x * 2);
      const x1 = Math.min(size - 1, x * 2 + 1);
      out[y * next + x] = (data[y0 * size + x0] + data[y0 * size + x1]
        + data[y1 * size + x0] + data[y1 * size + x1]) / 4;
    }
  }
  return {data: out, size: next};
}

function toHalf(data: Float32Array) {
  const out = new Uint16Array(data.length);
  for (let index = 0; index < data.length; index++) out[index] = DataUtils.toHalfFloat(data[index]);
  return out;
}

async function loadGround(id: string): Promise<LocationGround | null> {
  const metaResponse = await fetch(`${PLACES_CONFIG.groundSrc}${id}.json`);
  if (!metaResponse.ok) return null;
  const meta = await metaResponse.json() as LocationGroundMeta;
  const imageResponse = await fetch(`${PLACES_CONFIG.groundSrc}${id}.webp`);
  if (!imageResponse.ok) return null;
  // Read exactly as stored: the two bytes are one number, not colour.
  const bitmap = await createImageBitmap(await imageResponse.blob(), {
    colorSpaceConversion: 'none', premultiplyAlpha: 'none',
  });
  const {size} = meta;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', {willReadFrequently: true});
  if (!context) return null;
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const pixels = context.getImageData(0, 0, size, size).data;
  // Rows north to south in the file; the texture's v runs south to north. Heights in the elevation map's units.
  const scale = meta.stepMetres / PLACES_CONFIG.elevationTopMetres;
  let level = {data: new Float32Array(size * size), size};
  for (let row = 0; row < size; row++) {
    const target = (size - 1 - row) * size;
    for (let column = 0; column < size; column++) {
      const offset = (row * size + column) * 4;
      level.data[target + column] = (pixels[offset] * 256 + pixels[offset + 1]) * scale;
    }
  }
  const mipmaps = [{data: toHalf(level.data), width: size, height: size}];
  while (level.size > 1) {
    level = halve(level.data, level.size);
    mipmaps.push({data: toHalf(level.data), width: level.size, height: level.size});
  }
  const texture = new DataTexture(mipmaps[0].data, size, size, RedFormat, HalfFloatType);
  texture.mipmaps = mipmaps as unknown as DataTexture['mipmaps'];
  texture.generateMipmaps = false;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return {id, texture, meta};
}

/** The ground of the location with this id, once loaded; null while loading, for none, or on a failure. */
export function useLocationGround(id: string | null) {
  const [ground, setGround] = useState<LocationGround | null>(null);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let pending = cache.get(id);
    if (!pending) {
      pending = loadGround(id).catch(() => null);
      cache.set(id, pending);
    }
    void pending.then((loaded) => {
      if (!cancelled && loaded) setGround(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);
  return ground;
}
