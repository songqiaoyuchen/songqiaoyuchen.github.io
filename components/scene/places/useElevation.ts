// Loads the baked elevation map (scripts/assets/build-places-geo.mjs) once, decoded and read off the main thread by
// the places worker (lib/scene/placesElevation.ts): a texture for the globe shaders and a CPU sampler for placing
// markers on the relief. Alongside it, a summary: the map lightly blurred (escarpments, ridges and basins without
// the speckle), which the globe takes while a location is open; and the land's light points (PlacesLights) sampled from
// both. Rebuilt when the blur radius or the light density changes (Leva Places Location, Places). A missing file leaves
// the globe smooth.
'use client';

import {useEffect, useState} from 'react';
import {DataTexture, LinearFilter, RedFormat, RepeatWrapping, UnsignedByteType, Vector2, type Texture} from 'three';
import type {LonLat} from '@/data/places';
import {buildElevation, type ElevationBuild} from '@/lib/scene/placesElevation';
import {sampleMap, type ElevationMapData, type LightBuffers} from '@/lib/scene/placesWorker';

export type Elevation = {
  texture: Texture;
  /** One texel in map coordinates. */
  texel: Vector2;
  /** Normalized height (0 sea, 1 the highest ground) at a place. */
  heightAt: (place: LonLat) => number;
  /** The map blurred to its broad forms, in the same layout and units. */
  summary: Texture;
  summaryAt: (place: LonLat) => number;
  /** The land's light points sampled from the map and its summary. */
  lights: LightBuffers;
};

type ElevationMap = ElevationMapData & {texture: DataTexture};

// The map once decoded, per source: its texture serves every summary built on it.
const maps = new Map<string, ElevationMap>();

/** One byte per texel, rows bottom-up as the image texture was uploaded flipped (flipRows); the shaders read .r. */
function mapTexture(texels: Uint8Array, width: number, height: number) {
  const texture = new DataTexture(texels, width, height, RedFormat, UnsignedByteType);
  texture.wrapS = RepeatWrapping;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

// Bilinear between texel centres, wrapping east-west and clamped at the poles, as the shaders' linear filter reads
// the map (sampleMap), so markers stand exactly on the trails.
function elevationOf(map: ElevationMap, built: ElevationBuild): Elevation {
  const {width, height, heights} = map;
  const {summary} = built;
  return {
    texture: map.texture,
    texel: new Vector2(1 / width, 1 / height),
    heightAt: ([lon, lat]) => sampleMap(heights, width, height, lon, lat),
    summary: mapTexture(built.summaryTexels, width, height),
    summaryAt: ([lon, lat]) => sampleMap(summary, width, height, lon, lat),
    lights: built.lights,
  };
}

/** The elevation map once built; a new summary (the old one disposed) and light points whenever the blur or the
 * density changes, the map's texture kept. */
export function useElevation(src: string, summaryBlur: number, lightDensity: number) {
  const [elevation, setElevation] = useState<Elevation | null>(null);
  useEffect(() => {
    let cancelled = false;
    void buildElevation(src, summaryBlur, lightDensity, !maps.has(src)).then((built) => {
      if (cancelled || !built) return;
      let map = maps.get(src);
      if (!map) {
        if (!built.map) return;
        const {width, height, heights, heightTexels} = built.map;
        map = {width, height, heights, texture: mapTexture(heightTexels, width, height)};
        maps.set(src, map);
      }
      setElevation(elevationOf(map, built));
    }, () => {});
    return () => {
      cancelled = true;
    };
  }, [lightDensity, src, summaryBlur]);
  useEffect(() => () => elevation?.summary.dispose(), [elevation]);
  return elevation;
}
