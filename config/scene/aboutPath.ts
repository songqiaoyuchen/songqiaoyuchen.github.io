// About experience path: the ridge route, checkpoint positions on it, the path tube and per-entry camera framing.
// Positions are world [x, z]; heights follow the terrain. Leva's About Path folder saves the checkpoint keys here;
// its Edit route mode (AboutPathEditor.tsx) saves the route's waypoints.
import type {TimelineEntryId} from '@/data/about';

export type PlanPoint = readonly [number, number];

/**
 * The route: a zig-zag hike across the ridges left of the About view, as in the brief sketch: up the
 * foreground crest, right along the lower crest, back up-left over the middle crest, then up the spine
 * to the summit. Traced from the baked height field, each stretch pulled onto its local crest; the smooth
 * path through the waypoints is sampled by lib/scene/aboutPath.ts.
 */
export const ABOUT_ROUTE = {
  waypoints: [
    [2.329, -3.446], [2.217, -3.328], [2.067, -3.266], [1.908, -3.217], [1.801, -3.093],
    [1.669, -3.004], [1.495, -2.978], [1.352, -2.959], [1.258, -2.885], [1.128, -2.778],
    [1.005, -2.706], [0.894, -2.726], [0.778, -2.827], [0.679, -2.94], [0.599, -3.068],
    [0.535, -3.127], [0.505, -3.031], [0.509, -2.872], [0.501, -2.715], [0.465, -2.56],
    [0.363, -2.413], [0.329, -2.258], [0.319, -2.101], [0.288, -1.946], [0.244, -1.794],
    [0.245, -1.63], [0.203, -1.477], [0.155, -1.325], [0.084, -1.178], [0.051, -1.023],
    [-0.018, -0.905], [-0.162, -0.834], [-0.306, -0.767], [-0.453, -0.708], [-0.599, -0.645],
    [-0.748, -0.594], [-0.904, -0.569], [-1.065, -0.558], [-1.218, -0.521], [-1.367, -0.471],
    [-1.522, -0.439], [-1.681, -0.424], [-1.84, -0.41],
  ] as readonly PlanPoint[],
};

export type AboutCheckpointId = TimelineEntryId | 'next';

/**
 * One checkpoint per timeline entry at the route's turns, oldest first, then the "Next?" summit.
 * Each snaps onto the route; Edit route slides them along it.
 */
export const ABOUT_CHECKPOINTS: Record<AboutCheckpointId, PlanPoint> = {
  medic: [2.329, -3.446],
  nus: [1.573156, -2.985431],
  greyhats: [0.53, -3.116],
  sonicboom: [0.296, -1.945],
  uniplans: [0.054, -0.94],
  next: [-1.84, -0.41],
};

/**
 * About's map: on About the glowing homepage contours give way to these quieter ones, like a survey
 * map: evenly spaced, thin, steady (no pulse), every fifth an index line. They dim with plan
 * distance from the route's centre and follow the terrain's light, so dark ground keeps dark lines. Overrides
 * config/scene/contours.ts; geometry is built by the terrain worker the first time About opens.
 */
export const ABOUT_MAP_CONFIG = {
  contours: {
    levels: 64,
    spacingJitter: 0,
    shadowChance: 0,
    majorEvery: 5,
    majorMinHeight: 0,
    minorRadius: 0.0035,
    majorRadius: 0.0055,
    minorColor: '#cda84d',
    minorIntensity: 0.22,
    minorBase: 1, // steady brightness: no pulse
    majorColor: '#e8c77a',
    majorIntensity: 0.42,
    pulseTint: 0,
  },
  // Distant lines keep this on-screen radius (device pixels) and dim, rather than breaking up.
  minPixels: 0.6,
  // Phones see the whole ridge from far off, where every line is widened and dimmed: a little wider, and
  // brighter by this gain (both intensities), so the map reads as on desktop (AboutMap.tsx).
  phoneMinPixels: 1,
  phoneIntensityGain: 3.2,
  // and push the distance fog out this many times while About is open, as their camera stands further back
  // (SceneFog.tsx).
  phoneFogScale: 1.7,
  // [x, z, dim start, dim end, brightness kept beyond], world units around the route's centre:
  // the ridges it crosses keep full brightness; the background stays mapped, darkened.
  focus: [0.25, -1.95, 2.1, 3.8, 0.6] as readonly [number, number, number, number, number],
  // In the background, lines also follow the terrain's light: [share kept on unlit ground, baked
  // light at which none is lost]. Baked light is small: median 0.006, 90th percentile 0.07.
  lighting: [0.6, 0.06] as readonly [number, number],
  // Altitude figures on contour lines beside the route: one every `spacing` world units of route,
  // alternating sides `offset` away. Figures read as metres from an invented datum.
  altitudes: {
    spacing: 0.9,
    offset: 0.42,
    levelEvery: 1,
    datum: 380,
    metresPerHeight: 6400, // per unit of normalized terrain height
  },
} as const;

export const ABOUT_PATH_CONFIG = {
  lift: 0.02, // world units above the rendered surface (about two tube radii, so the tube rests on it)
  radius: 0.011, // tube radius, world units
  phoneRadiusScale: 1.8, // phones see the whole route from further away
  dashLength: 0.07, // world units per dash and gap of the trail ahead
  // The trail's signal colour: the one hue besides gold, kept to the route and its markers (the
  // travelled path, the dashed trail ahead, checkpoint markers). Titles, links and focus stay gold.
  trailColor: '#8fe3d6',
  trackIntensity: 0.5, // the dashed trail ahead
  phoneTrackIntensity: 1.2, // phones: the whole route seen from far off, the trail ahead must still read
  phoneDashScale: 2.2, // phones: longer dashes, so they stay dashes at that distance
  drawnIntensity: 1, // the travelled path; it blooms
  // Framing an entry: shift the About pose so the checkpoint moves focusFollow of the way toward
  // this screen point (normalized device coordinates; the drawer covers the right), then dolly
  // toward it by focusZoom of the distance.
  focusScreen: [-0.45, -0.1] as readonly [number, number],
  focusFollow: 0.6,
  focusZoom: 0.18,
  // Phones: an entry is framed the same way from the phone About pose (camera.ts mobileAbout*), toward a point
  // in the window above the drawer.
  phoneFocusScreen: [-0.42, 0.5] as readonly [number, number], // left of centre: its title reads to the right
  phoneFocusFollow: 0.85,
  phoneFocusZoom: 0.3,
  // Camera journey times: between the landscape and the About pose, and between entries on the path.
  journeySeconds: 1,
  focusSeconds: 0.7,
  // The reading head must rest this long on an entry before the camera follows it.
  settleMs: 160,
} as const;
