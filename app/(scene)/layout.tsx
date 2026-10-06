// Shared layout for Home and Art: keeps one SceneShell (and its WebGL scene) alive across both.
import type {ReactNode} from 'react';
import {ArtSceneProvider} from '@/components/art/ArtSceneContext';
import {SceneShell} from '@/components/shell/SceneShell';
import {getAllArticles} from '@/lib/content/articles';

export default async function SceneLayout({children}: {children: ReactNode}) {
  const articles = await getAllArticles();
  return (
    <ArtSceneProvider>
      <SceneShell articles={articles.slice(0, 3)}>{children}</SceneShell>
    </ArtSceneProvider>
  );
}
