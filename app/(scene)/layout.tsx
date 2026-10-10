// Shared layout for Home, About, Art and Travel: keeps one SceneShell (and its WebGL scene) alive across them.
import type {ReactNode} from 'react';
import {ArtSceneProvider} from '@/components/art/ArtSceneContext';
import {SceneShell} from '@/components/shell/SceneShell';
import {TravelSceneProvider} from '@/components/travel/TravelSceneContext';
import {getAllArticles} from '@/lib/content/articles';

export default async function SceneLayout({children}: {children: ReactNode}) {
  const articles = await getAllArticles();
  return (
    <ArtSceneProvider>
      <TravelSceneProvider>
        <SceneShell articles={articles.slice(0, 3)}>{children}</SceneShell>
      </TravelSceneProvider>
    </ArtSceneProvider>
  );
}
