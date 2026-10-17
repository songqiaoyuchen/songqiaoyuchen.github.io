// Camera journey planning: a journey is always one motion straight from the pose the camera holds to the one asked
// for, whatever the two are, and its kind decides its timing. The effects (the Places morph, the Art flight fog,
// the globe's focus progress) go by the journey's two ends and run over its whole length. No stop on the way:
// a location leaves straight to Art as one shrink, Art to Places is one zoom-out, the overview is just another angle.
//
// Pose keys as CameraRig names them: 'overview' or 'mobile-overview' (both the root, 'home' here), 'projects',
// 'blog', 'about', 'about:<stop>', 'art', 'places', 'places:index' (phones, the location list pulled up) and
// 'places:location'.

export type LegKind =
  | 'default' | 'art' | 'aboutFocus' | 'aboutEntry' | 'placesFocus' | 'placesIndex' | 'placesEntry';

export type JourneyLeg = Readonly<{from: string; to: string; kind: LegKind}>;

export const HOME = 'home';

export function isHomeKey(key: string) {
  return key === 'overview' || key === 'mobile-overview' || key === HOME;
}

export const isAboutKey = (key: string) => key === 'about' || key.startsWith('about:');
export const isPlacesKey = (key: string) => key === 'places' || key === 'places:index' || key === 'places:location';

/**
 * What a journey between two poses is, for its timing: Places's
 * moves first (into or out of Places the terrain
 * morphs, which sets the pace whatever the other end; between its overview and a location the globe turns; the phone
 * list pulled up or let down is a quick step back with no turn), then
 * Art's flight, then About's.
 */
export function legKind(from: string, to: string): LegKind {
  const ends = `${from}>${to}`;
  if (ends === 'places>places:index' || ends === 'places:index>places') return 'placesIndex';
  if (isPlacesKey(from) && isPlacesKey(to)) return 'placesFocus';
  if (isPlacesKey(from) !== isPlacesKey(to)) return 'placesEntry';
  if (from === 'art' || to === 'art') return 'art';
  if (isAboutKey(from) && isAboutKey(to)) return 'aboutFocus';
  if (isAboutKey(from) !== isAboutKey(to)) return 'aboutEntry';
  return 'default';
}

/** The one leg from a pose to another; the overview keys are one stop. */
export function planJourney(from: string, to: string): JourneyLeg {
  const origin = isHomeKey(from) ? HOME : from;
  const destination = isHomeKey(to) ? HOME : to;
  return {from: origin, to: destination, kind: legKind(origin, destination)};
}
