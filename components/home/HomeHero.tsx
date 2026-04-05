import { HomeScene } from './HomeScene';
import { HomeOverlay } from './HomeOverlay';

export function HomeHero() {
  return (
    <section className="relative w-full h-screen overflow-hidden bg-neutral-950">
      <HomeScene />
      <HomeOverlay />
    </section>
  );
}
