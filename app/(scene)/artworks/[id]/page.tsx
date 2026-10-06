// Artwork inspection route (/artworks/[id]): static params and metadata; ArtSection renders the dialog.
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {ALL_ARTWORKS, getArtwork} from '@/data/artworks';

export function generateStaticParams() {
  return ALL_ARTWORKS.map(({id}) => ({id}));
}
export const dynamicParams = false;

export async function generateMetadata({params}: {params: Promise<{id: string}>}): Promise<Metadata> {
  const {id} = await params;
  const artwork = getArtwork(id);
  if (!artwork) notFound();
  return {
    title: `${artwork.title} | Art | SQYC`,
    description: artwork.description || `${artwork.title}. ${artwork.material}. ${artwork.size}.`,
  };
}

export default async function ArtworkPage({params}: {params: Promise<{id: string}>}) {
  if (!getArtwork((await params).id)) notFound();
  return null;
}
