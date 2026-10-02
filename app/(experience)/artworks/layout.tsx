import type {ReactNode} from 'react';
import {ArtExperience} from '@/components/artworks/ArtExperience';
import '@/components/artworks/art.css';

export default function ArtLayout({children}: {children: ReactNode}) {
  return (
    <>
      <ArtExperience />
      {children}
    </>
  );
}
