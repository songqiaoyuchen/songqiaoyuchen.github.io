'use client';

import { useState } from 'react';
import { TopNav } from '@/components/TopNav';
import { HeroPanel } from '@/components/HeroPanel';
import { PreviewDrawer } from '@/components/PreviewDrawer';
import { TerrainBackground } from '@/components/scene/TerrainBackground';
import type { HomeSection } from '@/data/homeFocusSections';

export default function Home() {
  const [activeSection, setActiveSection] = useState<HomeSection | null>(null);
  const isFocused = activeSection !== null;
  const activeNavSection =
    activeSection === 'projects' || activeSection === 'art' || activeSection === 'travel'
      ? activeSection
      : null;

  function handleSectionClick(section: HomeSection) {
    setActiveSection((current) => (current === section ? null : section));
  }

  return (
    <div className="relative h-svh w-full overflow-hidden bg-background text-foreground">
      <TerrainBackground activeSection={activeSection} onLinkStreamClick={handleSectionClick} />
      <HeroPanel isFocused={isFocused} />
      <PreviewDrawer
        activeSection={activeSection}
        onClose={() => setActiveSection(null)}
      />
      <TopNav activeSection={activeNavSection} onSectionClick={handleSectionClick} />
    </div>
  );
}
