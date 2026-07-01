'use client';

import { useHomeState } from '@/components/useHomeState';
import { HeroPanel } from '@/components/HeroPanel';
import { TopNav } from '@/components/TopNav';
import { TerrainBackground } from '@/components/TerrainBackground';

export default function Home() {
  const { activeSection, toggleSection } = useHomeState();

  return (
    <div className="relative h-svh w-full overflow-hidden bg-background text-foreground">
      <TerrainBackground />
      <TopNav activeSection={activeSection} onSectionClick={toggleSection} />
    </div>
  );
}
