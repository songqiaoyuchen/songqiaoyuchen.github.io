// All works route (/artworks/all): metadata only; ArtSection renders the collection.
import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'All works | Art | SQYC',
  description: 'The complete collection of oil paintings, pencil portraits, and digital illustrations by SQYC.',
};

export default function AllArtworksPage() { return null; }
