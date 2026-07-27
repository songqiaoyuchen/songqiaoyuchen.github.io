'use client';

import {useState} from 'react';
import type {SectionId} from '@/data/sections';
import {TerrainBackground} from '@/components/scene/TerrainBackground';
import {Drawer} from './drawer/Drawer';
import {Hero} from './Hero';
import { Leva } from 'leva';

export function Home() {
  const [activeId, setActiveId] = useState<SectionId | null>(null);

  function toggleSection(id: SectionId) {
    setActiveId((currentId) => currentId === id ? null : id);
  }

  return (
    <main className="relative h-svh w-full overflow-hidden bg-background text-foreground">
      <Leva
        collapsed={true}
        hidden={process.env.NODE_ENV !== 'development'}
        theme={{
          sizes: {
            rootWidth: '400px',
          },
        }}
      />
      <TerrainBackground
        activeId={activeId}
        onStreamClick={toggleSection}
      />
      <Hero isHidden={activeId !== null} />
      <Drawer activeId={activeId} onClose={() => setActiveId(null)} />
    </main>
  );
}
