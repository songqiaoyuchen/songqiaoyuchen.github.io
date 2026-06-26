'use client';

import { useHomeState } from '@/components/useHomeState';
import { NavRays } from '@/components/NavRays';
import { HeroPanel } from '@/components/HeroPanel';
import { TopNav } from '@/components/TopNav';
import { TerrainBackgroundPlaceholder } from '@/components/TerrainBackgroundPlaceholder';

export default function Home() {
  const { activeSection, toggleSection } = useHomeState();

  return (
    <div className="relative h-svh w-full overflow-hidden bg-background text-foreground">
      <TopNav activeSection={activeSection} onSectionClick={toggleSection} />

      <HeroPanel activeSection={activeSection} />
      <TerrainBackgroundPlaceholder />
    </div>
  );
}
