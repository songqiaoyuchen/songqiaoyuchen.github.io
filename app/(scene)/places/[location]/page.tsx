// Selected location route (/places/[location]): static params and metadata; PlacesSection renders the location panel.
// ?gallery=<id>&photo=<index> opens the photo viewer on one of the location's galleries.
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {getLocation, LOCATIONS} from '@/data/places';

export function generateStaticParams() {
  return LOCATIONS.map(({id}) => ({location: id}));
}
export const dynamicParams = false;

export async function generateMetadata({params}: {params: Promise<{location: string}>}): Promise<Metadata> {
  const location = getLocation((await params).location);
  if (!location) notFound();
  return {
    title: `${location.title} | Places | SQYC`,
    description: location.summary,
  };
}

export default async function LocationPage({params}: {params: Promise<{location: string}>}) {
  if (!getLocation((await params).location)) notFound();
  return null;
}
