// Per-frame backdrop decisions for CachedTerrain: which backdrop to wipe to, and the flight-fog release.
import {MathUtils, type Texture} from 'three';
import type {ArtMedium} from '@/data/artworks';
import type {BackdropId, BackdropWipe} from '@/lib/art/backdropWipe';

/** An unloaded image leaves the currently displayed backdrop intact. */
export function requestedBackdrop(
  backdrop: ArtMedium,
  oil: Texture | null,
  pencil: Texture | null,
  current: BackdropId,
): BackdropId {
  return backdrop === 'digital' ? 3
    : backdrop === 'oil' && oil ? 1 : backdrop === 'pencil' && pencil ? 2 : current;
}

export type FogRelease = {from: number; elapsed: number};

/**
 * Hold the flight fog until the arrival wipe has covered the terrain boundary,
 * then ease it out over `seconds`. Returns the new fog weight, or null to leave it.
 */
export function releaseFlightFog(
  release: FogRelease,
  wipe: BackdropWipe,
  currentFog: number,
  step: number,
  seconds: number,
): number | null {
  const {from, to} = wipe;
  if (from !== 0 && to !== 0) {
    if (release.elapsed < 0) Object.assign(release, {from: currentFog, elapsed: 0});
    release.elapsed += step;
    const t = Math.min(release.elapsed / seconds, 1);
    return release.from * (1 - MathUtils.smootherstep(t, 0, 1));
  }
  release.elapsed = -1;
  return null;
}
