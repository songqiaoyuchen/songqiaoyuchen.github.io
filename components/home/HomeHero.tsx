'use client';

import { HomeScene } from './HomeScene';
import { HomeOverlay } from './HomeOverlay';
import { useHomeNavigationState } from './scene/useHomeNavigationState';

export function HomeHero() {
  const navState = useHomeNavigationState();

  return (
    <section className="relative w-full h-screen overflow-hidden bg-neutral-950">
      <HomeScene
        activeLocationIndex={navState.activeLocationIndex}
        isTransitioning={navState.isTransitioning}
      />
      <HomeOverlay
        activeLocation={navState.activeLocation}
        activeLocationIndex={navState.activeLocationIndex}
        locationCount={navState.locationCount}
        canGoPrevious={navState.canGoPrevious}
        canGoNext={navState.canGoNext}
        onPrevious={navState.goToPreviousLocation}
        onNext={navState.goToNextLocation}
      />
    </section>
  );
}
