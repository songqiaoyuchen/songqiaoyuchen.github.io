'use client';

import { HomeScene } from './HomeScene';
import { HomeOverlay } from './HomeOverlay';
import { HOME_LOCATIONS } from './scene/locations/homeLocations';
import { useHomeNavigationState } from './scene/useHomeNavigationState';

export function HomeHero() {
  const locationCount = HOME_LOCATIONS.length;
  const navState = useHomeNavigationState(locationCount);

  return (
    <section className="relative w-full h-screen overflow-hidden bg-neutral-950">
      <HomeScene
        activeLocationIndex={navState.activeLocationIndex}
        isTransitioning={navState.isTransitioning}
      />
      <HomeOverlay />
    </section>
  );
}
