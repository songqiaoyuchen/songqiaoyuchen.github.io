// Camera journey planning: a journey is always one motion straight from the pose the camera holds to the one asked
// for, whatever the two are, and its kind decides its timing. The effects (the Travel morph, the Art flight fog,
// the globe's focus progress) go by the journey's two ends and run over its whole length. No stop on the way:
// a trip leaves straight to Art as one shrink, Art to Travel is one zoom-out, the overview is just another angle.
//
// Pose keys as CameraRig names them: 'overview' or 'mobile-overview' (both the root, 'home' here), 'projects',
// 'blog', 'about', 'about:<stop>', 'art', 'travel', 'travel:index' (phones, the trip list pulled up) and
// 'travel:trip'.

export type LegKind =
  | 'default' | 'art' | 'aboutFocus' | 'aboutEntry' | 'travelFocus' | 'travelIndex' | 'travelEntry';

export type JourneyLeg = Readonly<{from: string; to: string; kind: LegKind}>;

export const HOME = 'home';

export function isHomeKey(key: string) {
  return key === 'overview' || key === 'mobile-overview' || key === HOME;
}

export const isAboutKey = (key: string) => key === 'about' || key.startsWith('about:');
export const isTravelKey = (key: string) => key === 'travel' || key === 'travel:index' || key === 'travel:trip';

/**
 * What a journey between two poses is, for its timing: Travel's moves first (into or out of Travel the terrain
 * morphs, which sets the pace whatever the other end; between its overview and a trip the globe turns; the phone
 * list pulled up or let down is a quick step back with no turn), then
 * Art's flight, then About's.
 */
export function legKind(from: string, to: string): LegKind {
  const ends = `${from}>${to}`;
  if (ends === 'travel>travel:index' || ends === 'travel:index>travel') return 'travelIndex';
  if (isTravelKey(from) && isTravelKey(to)) return 'travelFocus';
  if (isTravelKey(from) !== isTravelKey(to)) return 'travelEntry';
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
