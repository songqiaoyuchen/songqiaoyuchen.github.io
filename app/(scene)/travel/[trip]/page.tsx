// Selected trip route (/travel/[trip]): static params and metadata; TravelSection renders the trip panel.
// ?photo=<index> opens the photo viewer on one of the trip's photos.
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {getTrip, TRIPS} from '@/data/travel';

export function generateStaticParams() {
  return TRIPS.map(({id}) => ({trip: id}));
}
export const dynamicParams = false;

export async function generateMetadata({params}: {params: Promise<{trip: string}>}): Promise<Metadata> {
  const trip = getTrip((await params).trip);
  if (!trip) notFound();
  return {
    title: `${trip.title} | Travel | SQYC`,
    description: trip.summary,
  };
}

export default async function TripPage({params}: {params: Promise<{trip: string}>}) {
  if (!getTrip((await params).trip)) notFound();
  return null;
}
