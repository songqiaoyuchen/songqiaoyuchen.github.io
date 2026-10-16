// Shared layout for Home, About, Art and Places: keeps one SceneShell (and its WebGL scene) alive across them.
import type {ReactNode} from 'react';
import {ArtSceneProvider} from '@/components/art/ArtSceneContext';
import {SceneShell} from '@/components/shell/SceneShell';
import {PlacesSceneProvider} from '@/components/places/PlacesSceneContext';
import {getAllArticles} from '@/lib/content/articles';

export default async function SceneLayout({children}: {children: ReactNode}) {
  const articles = await getAllArticles();
  return (
    <ArtSceneProvider>
      <PlacesSceneProvider>
        <SceneShell articles={articles.slice(0, 3)}>{children}</SceneShell>
      </PlacesSceneProvider>
    </ArtSceneProvider>
  );
}
