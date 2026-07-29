'use client';

import {useState} from 'react';
import type {SectionId} from '@/data/sections';
import type {ArticleSummary} from '@/lib/content/types';
import {TerrainBackground} from '@/components/scene/TerrainBackground';
import {Drawer} from './drawer/Drawer';
import {Hero} from './Hero';
import { Leva } from 'leva';

interface HomeProps {
  articles: readonly ArticleSummary[];
}

export function Home({articles}: HomeProps) {
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
      <Drawer
        activeId={activeId}
        articles={articles}
        onClose={() => setActiveId(null)}
      />
    </main>
  );
}
