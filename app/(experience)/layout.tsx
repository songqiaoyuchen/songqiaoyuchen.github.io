import type {ReactNode} from 'react';
import {Home} from '@/components/home/Home';
import {ArtSceneProvider} from '@/components/artworks/ArtSceneContext';
import {getAllArticles} from '@/lib/content/articles';

export default async function ExperienceLayout({children}: {children: ReactNode}) {
  const articles = await getAllArticles();
  return (
    <ArtSceneProvider>
      <Home articles={articles.slice(0, 3)}>{children}</Home>
    </ArtSceneProvider>
  );
}
