// Loads the baked elevation map (scripts/assets/build-travel-geo.mjs) once: a texture for the globe shaders and a
// CPU sampler for placing markers on the relief. Alongside it, a summary: the map lightly blurred (escarpments,
// ridges and basins without the speckle), which the globe takes while a trip is open; rebuilt when its blur radius
// changes (Leva Travel Trip). A missing file leaves the globe smooth.
'use client';

import {useEffect, useMemo, useState} from 'react';
import {DataTexture, LinearFilter, RedFormat, RepeatWrapping, Texture, UnsignedByteType, Vector2} from 'three';
import type {LonLat} from '@/data/travel';

export type Elevation = {
  texture: Texture;
  /** One texel in map coordinates. */
  texel: Vector2;
  /** Normalized height (0 sea, 1 the highest ground) at a place. */
  heightAt: (place: LonLat) => number;
  /** The map blurred to its broad forms, in the same layout and units. */
  summary: Texture;
  summaryAt: (place: LonLat) => number;
};

type ElevationMap = {
  texture: Texture;
  width: number;
  height: number;
  /** The map's heights, 0 to 255, rows top-down as in the image. */
  values: Uint8Array;
};

let cached: Promise<ElevationMap | null> | null = null;

// Three box passes (about a Gaussian) of radius texels, wrapping east-west and clamped at the poles, in place.
function blur(values: Float32Array, width: number, height: number, radius: number) {
  const scratch = new Float32Array(values.length);
  const span = 2 * radius + 1;
  const wrap = (column: number) => ((column % width) + width) % width;
  const clamp = (row: number) => Math.min(height - 1, Math.max(0, row));
  for (let pass = 0; pass < 3; pass++) {
    for (let row = 0; row < height; row++) {
      const base = row * width;
      let sum = 0;
      for (let k = -radius; k <= radius; k++) sum += values[base + wrap(k)];
      for (let column = 0; column < width; column++) {
        scratch[base + column] = sum / span;
        sum += values[base + wrap(column + radius + 1)] - values[base + wrap(column - radius)];
      }
    }
    for (let column = 0; column < width; column++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) sum += scratch[clamp(k) * width + column];
      for (let row = 0; row < height; row++) {
        values[row * width + column] = sum / span;
        sum += scratch[clamp(row + radius + 1) * width + column] - scratch[clamp(row - radius) * width + column];
      }
    }
  }
}

function loadElevation(src: string) {
  cached ??= new Promise<ElevationMap | null>((resolve) => {
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
      const values = new Uint8Array(width * height);
      for (let index = 0; index < values.length; index++) values[index] = data[index * 4];
      resolve({texture, width, height, values});
    };
    image.onerror = () => resolve(null);
    image.src = src;
  });
  return cached;
}

/** The map with its summary blurred over `summaryBlur` texels (TRAVEL_TRIP_CONFIG), and samplers for both. */
function withSummary({texture, width, height, values: heights}: ElevationMap, summaryBlur: number): Elevation {
  const values = Float32Array.from(heights);
  if (summaryBlur > 0) blur(values, width, height, Math.round(summaryBlur));
  // Rows bottom-up, as the image texture is uploaded flipped; the CPU sampler reads what the shaders read.
  const bytes = new Uint8Array(values.length);
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const index = row * width + column;
      values[index] = Math.round(values[index]);
      bytes[(height - 1 - row) * width + column] = values[index];
    }
  }
  const summary = new DataTexture(bytes, width, height, RedFormat, UnsignedByteType);
  summary.wrapS = RepeatWrapping;
  summary.minFilter = LinearFilter;
  summary.magFilter = LinearFilter;
  summary.needsUpdate = true;
  const indexAt = ([lon, lat]: LonLat) => {
    const column = Math.min(width - 1, Math.max(0, Math.round((lon + 180) / 360 * (width - 1))));
    const row = Math.min(height - 1, Math.max(0, Math.round((90 - lat) / 180 * (height - 1))));
    return row * width + column;
  };
  return {
    texture,
    texel: new Vector2(1 / width, 1 / height),
    heightAt: (place) => heights[indexAt(place)] / 255,
    summary,
    summaryAt: (place) => values[indexAt(place)] / 255,
  };
}

/** The elevation map once loaded; a new summary (the old one disposed) whenever the blur changes. */
export function useElevation(src: string, summaryBlur: number) {
  const [map, setMap] = useState<ElevationMap | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadElevation(src).then((loaded) => {
      if (!cancelled) setMap(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);
  const elevation = useMemo(() => (map ? withSummary(map, summaryBlur) : null), [map, summaryBlur]);
  useEffect(() => () => elevation?.summary.dispose(), [elevation]);
  return elevation;
}
