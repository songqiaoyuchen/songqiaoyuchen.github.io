// Travel overview route (/travel): metadata only; TravelSection in the travel layout renders the trip index
// beside the globe.
import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Travel | SQYC',
  description: 'Places SQYC has travelled, on a globe: routes ridden and places visited.',
};

export default function TravelPage() {
  return null;
}
