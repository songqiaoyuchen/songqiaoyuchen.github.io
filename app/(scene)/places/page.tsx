// Places overview route (/places): metadata only; PlacesSection in the places layout renders the location index
// beside the globe.
import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Places | SQYC',
  description: 'Places SQYC has travelled, on a globe: paths ridden and locations visited.',
};

export default function PlacesPage() {
  return null;
}
