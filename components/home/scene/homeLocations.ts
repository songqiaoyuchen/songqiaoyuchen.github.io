export type HomeLocation = {
  id: string;
  label: string;
  lat: number;
  lon: number;
  description: string;
  ctaLabel: string;
};

// Array order is the Phase B navigation order.
export const HOME_LOCATIONS: HomeLocation[] = [
  {
    id: 'beijing',
    label: 'Beijing',
    lat: 39.9042,
    lon: 116.4074,
    description: 'Explore partnerships and momentum across Northern China.',
    ctaLabel: 'View Beijing',
  },
  {
    id: 'singapore',
    label: 'Singapore',
    lat: 1.3521,
    lon: 103.8198,
    description: 'Track regional operations and growth throughout Southeast Asia.',
    ctaLabel: 'View Singapore',
  },
  {
    id: 'san-francisco',
    label: 'San Francisco',
    lat: 37.7749,
    lon: -122.4194,
    description: 'Follow product, partnerships, and innovation on the US West Coast.',
    ctaLabel: 'View San Francisco',
  },
];

export const HOME_LOCATIONS_BY_ID: Record<string, HomeLocation> =
  Object.fromEntries(HOME_LOCATIONS.map((location) => [location.id, location]));
