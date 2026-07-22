'use client';

import {useState} from 'react';
import type {SectionId} from '@/data/sections';
import {TerrainBackground} from '@/components/scene/TerrainBackground';
import {Drawer} from './Drawer';
import {Hero} from './Hero';
import {Nav} from './Nav';
import { Leva } from 'leva';

export function Home() {
  // ??? this active id is used in so many places, why not make it global state?
  // i often do this with redux but im sure zustand works just fine?
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
      <TerrainBackground activeId={activeId} onStreamClick={toggleSection} />
      <Hero isHidden={activeId !== null} />
      <Drawer activeId={activeId} onClose={() => setActiveId(null)} />
      <Nav activeId={activeId} onSectionClick={toggleSection} />
    </main>
  );
}
