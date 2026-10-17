// Places globe: a night globe above the terrain, in three groups so neither view's tuning reaches the other.
// PLACES_CONFIG is shared by both views and the zoom-out, PLACES_OVERVIEW_CONFIG is all locations (/places),
// PLACES_LOCATION_CONFIG a selected location (/places/[location]); between them the globe eases over the focus journey.
// dev-config writes Leva's Places, Places Overview and Places Location folders to their group; poses live in camera.ts.
// Type-only imports keep this file loadable by the node scripts in scripts/test.
import type {Vector3Tuple} from 'three';

export const PLACES_CONFIG = {
  center: [0, 17, 0] as Vector3Tuple, // world position, above the terrain's centre
  radius: 3, // world units

  // The globe's look, the same in both views (PlacesGlobe.tsx -> globe.frag).
  baseColor: '#0b0d14', // dark ground; also what the landscape fades to on the way in
  rimColor: '#e8c77a',
  rimIntensity: 0.2, // fresnel rim of the resting globe, off on the way
  lineColor: '#e8c77a', // graticule, coastlines, lights, rings and stars
  graticuleStep: 15, // degrees between meridians and parallels
  graticuleIntensity: 0.11, // graticule opacity
  coastIntensity: 0.51, // coastline and lake opacity

  // Land lights (PlacesLights.tsx), denser in lowlands; half strength over lightsIn, full with the lines.
  lightDensity: 0.19, // share of candidate land points kept
  lightSize: 2.4, // CSS pixels at full brightness
  lightIntensity: 1.29, // brightness gain, bloom included
  phoneLightScale: 0.5, // phones draw the globe smaller: the same points would merge into one glow
  lightsIn: [0.15, 0.55] as readonly [number, number], // share of the zoom-out

  // Stars behind the globe (PlacesStars.tsx).
  starCount: 1400,
  starRadius: 60, // world units from the globe's centre
  starSize: 3.2, // CSS pixels
  starDrift: 0.012, // radians per second the sky turns about starAxis (about nine minutes a turn)
  starAxis: [0.25, 1, 0.15] as readonly [number, number, number], // tilted off the pole: the drift reads as a swirl
  starsIn: [0.5, 0.9] as readonly [number, number], // share of the zoom-out

  // Location trails along recorded tracks (PlacesTrails.tsx), one line per location across any gaps between recordings;
  // lights and markers stand on the same lift. Each view sets its own thickness (trailRadius).
  trailColor: '#8fe3d6', // also the markers' signal colour (Places.css --places-signal)
  trailLift: 0.004, // height above the relief, share of the globe radius
  trailStep: 0.5, // degrees between samples along a track

  maxPitch: 80, // degrees the poles may tip toward the camera, by hand or by any turn to a location

  // Zoom-out from the landscape into either view (CameraRig 'placesEntry', camera.ts CAMERA_JOURNEY_CONFIG): an
  // Earth-sized planet under the landscape shrinks to the globe while the terrain rides on it. Ranges are shares of
  // the journey.
  landscapeKm: 20, // real ground the landscape stands for; sizes the planet (lib/scene/places.ts planetScale)
  patchRelief: 1, // riding terrain height exaggeration, 1 = true scale
  vanish: 1, // shrink the terrain away from this share, 1 = scale alone
  landIn: [0.03, 0.18] as readonly [number, number], // landscape light gives way to the globe's land shading
  linesIn: [0.75, 0.97] as readonly [number, number], // rim, graticule and coastlines come in (rings: ringsRoom)
  trailsIn: [0.85, 1] as readonly [number, number], // trails come in
  hazeOut: [0.15, 0.8] as readonly [number, number], // haze thins (SceneFog.tsx)
  hazeFactor: 60, // fog distances grow this many times
  reliefIn: [0.85, 1] as readonly [number, number], // physical relief becomes the overview's map relief

  // Elevation map scale: NASA's image is linear and saturates near 4,600 m (Chengdu 500 m reads 28).
  elevationTopMetres: 4600,
  physicalRelief: 4600 / 6371000, // real relief: the map's top over Earth's radius
  regionSlopeGain: 1, // regional tile hillshade gain, to read like the global map

  // Baked geography (scripts/assets/build-places-geo.mjs); missing files leave the globe bare.
  coastSrc: '/places/coast.bin',
  elevationSrc: '/places/elevation.png',
  regionSrc: '/places/region.png',
  groundSrc: '/places/ground/', // each location's own ground: <location id>.webp and .json (useLocationGround.ts)
  regionMetaSrc: '/places/region.json',
} as const;

export const PLACES_OVERVIEW_CONFIG = {
  // Resting globe ground (globe.vert/.frag, landShading.glsl); the riding landscape takes the same shade and tint.
  relief: 0.012, // surface height at the highest ground, share of the radius
  shade: 0, // hillshade strength; off for the night globe
  landTint: 0.015, // land lightening with height
  trailRadius: 0.0035, // trail tube radius, share of the globe radius
  markerSize: 14, // CSS pixels: every location's reticle (PlacesCallouts.tsx); the diamond is half
  clusterWithin: 3.5, // degrees: locations nearer than this (chained) share one marker that fans out on a click
  phoneClusterWithin: 9, // degrees, on phones: the globe is drawn about half the size, so more locations share a marker

  // Orbit rings (PlacesRings.tsx), outside the globe's turn and its ride; gone while a location is open. On the
  // zoom-out they are the last thing in and the first out: the planet grows about the camera, off the resting
  // centre, long before the lines fade, so the rings leave as it grows past ringsRoom times the globe's radius.
  // Per ring: radius (share of the globe's), arcs with gap degrees between, a fainter inner track when double,
  // ticks (every sixth longer), spin in degrees per second about its own axis. Their tilts are tuned apart.
  ringsRoom: 1.1, // the planet this many times the globe's radius has the rings gone (less than the first ring's)
  rings: [
    {radius: 1.28, arcs: 4, gap: 14, ticks: 72, double: false, spin: 2},
    {radius: 1.42, arcs: 1, gap: 0, ticks: 90, double: false, spin: -1.2},
  ] as readonly {radius: number; arcs: number; gap: number; ticks: number; double: boolean; spin: number}[],
  innerRingTilt: [-197.799805, 117.800018] as readonly [number, number], // the first ring's tilt about x and z, degrees
  outerRingTilt: [-20.799561, -20.999817] as readonly [number, number], // the second ring's
  ringIntensity: 0.4, // ring brightness
  ringDragGain: 0.12, // extra spin multiples per degree per second the globe turns, signed with the turn

  // Turning by hand (PlacesGlobe.tsx -> lib/scene/places.ts advanceGlobe): drag, coast, capture, drift.
  dragGain: 0.9, // surface speed as a share of the pointer's
  friction: 2.3, // release velocity decay, per second
  snapBelow: 5, // degrees per second; slower coasting lets the nearest location take over
  capture: 35, // degrees from the globe's front a location can capture from
  snapRate: 2, // share of the remaining error the capture servo closes per second
  idleDrift: 3, // degrees per second while untouched and resting on no location
  idleAfter: 2, // seconds untouched before drifting

  // Focus (PlacesGlobe.tsx -> lib/scene/places.ts focusedLocation): a location near the globe's centre shows its open
  // cue, by where the globe stands alone, apart from the capture servo.
  focusWithin: 22, // degrees from the globe's front; a focused location keeps focus until 5 degrees past it
  titleWithin: 30, // degrees from the globe's front; the nearest location within shows its title beside its marker

} as const;

export const PLACES_LOCATION_CONFIG = {
  // Framing: the middle of the location's places turns to its marker point while the camera moves to the location pose
  // (camera.ts placesLocation*).
  markerOffset: [0.693, 0.774] as readonly [number, number], // right and up of centre, shares of the radius
  phoneMarkerOffset: [0, -0.2] as readonly [number, number], // phones: mid-view above the location's sheet
  holdRate: 2, // share of the remaining error the servo closes per second holding the location

  // Along the journey between the overview and a location, either way (camera.ts CAMERA_JOURNEY_CONFIG.placesFocus);
  // the look eases over it too.
  turnFrom: 0.3, // share of the journey the globe holds before turning
  turnSettle: 0.6, // seconds the turn settles past the camera's landing
  revealAt: 0.75, // share of the return turn before the rings, other markers and titles come back
  stopsFrom: 0.85, // share of the journey in before the location's stops fade in (they leave as the return starts)

  // Raised-relief map (globe.vert/.frag); replaces the overview's ground. Trails, lights and markers ride it.
  summaryBlur: 0.1, // elevation blur radius in texels, three box passes; 0 keeps the full map (useElevation.ts)
  relief: 0.026, // surface height at the highest ground, share of the radius
  shade: 0.25, // hillshade strength
  landTint: 0.08, // land lightening with height
  trailRadius: 0.0014, // trail tube radius, share of the globe radius; thinner up close
  markerSize: 38, // CSS pixels, the open location's markers; larger up close

  // Zoom (lib/scene/placesLens.ts, placesLens.glsl): a small location magnified by a conformal zoom of the surface as
  // it opens; the globe keeps its size. Each location's zoom draws its farthest place lensFill degrees from its centre,
  // up to lensMaxZoom.
  lensFill: 10, // degrees
  lensMaxZoom: 4,
  lensMinZoom: 1.6, // locations that would take less are not zoomed (G318, at 1.55, stays as it was)
  lensMargin: 0.15, // share of the farthest place's angle kept as room about the location
  lensRelief: 0.5, // heights follow the ground's scale to this power
  groundShade: 0.16, // hillshade gain of a location's own ground (its finer slopes), to read like the map's
  groundFadeSeconds: 0.6, // a ground arriving after the location opened fades in over this
} as const;
