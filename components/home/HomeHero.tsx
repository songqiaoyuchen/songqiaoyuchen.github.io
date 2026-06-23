'use client';

import { Leva } from 'leva';
import { HomeScene } from './HomeScene';
import { HomeOverlay } from './HomeOverlay';
import { useHomeNavigationState } from './scene/useHomeNavigationState';

export function HomeHero() {
  const navState = useHomeNavigationState();

  return (
    <section className="relative w-full h-screen overflow-hidden bg-neutral-950">
      <Leva collapsed={false} hidden={process.env.NODE_ENV === 'production'} />
      <HomeScene
        activeLocation={navState.activeLocation}
        activeLocationIndex={navState.activeLocationIndex}
        isTransitioning={navState.isTransitioning}
      />
      <HomeOverlay />
    </section>
  );
}
