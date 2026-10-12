// Travel globe: a night globe above the terrain, in three groups so neither view's tuning reaches the other.
// TRAVEL_CONFIG is shared by both views and the zoom-out, TRAVEL_OVERVIEW_CONFIG is all trips (/travel),
// TRAVEL_TRIP_CONFIG a selected trip (/travel/[trip]); between them the globe eases over the focus journey.
// dev-config writes Leva's Travel, Travel Overview and Travel Trip folders to their group; poses live in camera.ts.
// Type-only imports keep this file loadable by the node scripts in scripts/test.
import type {Vector3Tuple} from 'three';

export const TRAVEL_CONFIG = {
  center: [0, 17, 0] as Vector3Tuple, // world position, above the terrain's centre
  radius: 3, // world units

  // The globe's look, the same in both views (TravelGlobe.tsx -> globe.frag).
  baseColor: '#0b0d14', // dark ground; also what the landscape fades to on the way in
  rimColor: '#e8c77a',
  rimIntensity: 0.45, // fresnel rim of the resting globe, off on the way
  lineColor: '#e8c77a', // graticule, coastlines, lights, rings and stars
  graticuleStep: 15, // degrees between meridians and parallels
  graticuleIntensity: 0.08, // graticule opacity
  coastIntensity: 0.3, // coastline and lake opacity

  // Land lights (TravelLights.tsx), denser in lowlands; half strength over lightsIn, full with the lines.
  lightDensity: 0.5, // share of candidate land points kept
  lightSize: 4, // CSS pixels at full brightness
  phoneLightScale: 0.5, // phones draw the globe smaller: the same points would merge into one glow
  lightsIn: [0.15, 0.55] as readonly [number, number], // share of the zoom-out

  // Stars behind the globe (TravelStars.tsx).
  starCount: 1400,
  starRadius: 60, // world units from the globe's centre
  starSize: 3.2, // CSS pixels
  starDrift: 0.012, // radians per second the sky turns about starAxis (about nine minutes a turn)
  starAxis: [0.25, 1, 0.15] as readonly [number, number, number], // tilted off the pole: the drift reads as a swirl
  starsIn: [0.5, 0.9] as readonly [number, number], // share of the zoom-out

  // Trip trails along recorded tracks (TravelTrails.tsx), one line per trip across any gaps between recordings;
  // lights and markers stand on the same lift. Each view sets its own thickness (trailRadius).
  trailColor: '#8fe3d6', // also the markers' signal colour (Travel.css --travel-signal)
  trailLift: 0.004, // height above the relief, share of the globe radius
  trailStep: 0.5, // degrees between samples along a track

  maxPitch: 80, // degrees the poles may tip toward the camera, by hand or by any turn to a trip

  // Zoom-out from the landscape into either view (CameraRig 'travelEntry'): an Earth-sized planet under the
  // landscape shrinks to the globe while the terrain rides on it. Ranges are shares of the journey.
  journeySeconds: 2, // into or out of Travel
  landscapeKm: 20, // real ground the landscape stands for; sizes the planet (lib/scene/travel.ts planetScale)
  patchRelief: 1, // riding terrain height exaggeration, 1 = true scale
  vanish: 1, // shrink the terrain away from this share, 1 = scale alone
  landIn: [0.03, 0.18] as readonly [number, number], // landscape light gives way to the globe's land shading
  linesIn: [0.75, 0.97] as readonly [number, number], // rim, graticule, coastlines and rings come in
  trailsIn: [0.85, 1] as readonly [number, number], // trails come in
  hazeOut: [0.15, 0.8] as readonly [number, number], // haze thins (SceneFog.tsx)
  hazeFactor: 60, // fog distances grow this many times
  reliefIn: [0.85, 1] as readonly [number, number], // physical relief becomes the overview's map relief

  // Elevation map scale: NASA's image is linear and saturates near 4,600 m (Chengdu 500 m reads 28).
  elevationTopMetres: 4600,
  physicalRelief: 4600 / 6371000, // real relief: the map's top over Earth's radius
  regionSlopeGain: 1, // regional tile hillshade gain, to read like the global map

  // Baked geography (scripts/assets/build-travel-geo.mjs); missing files leave the globe bare.
  coastSrc: '/travel/coast.bin',
  elevationSrc: '/travel/elevation.png',
  regionSrc: '/travel/region.png',
  regionMetaSrc: '/travel/region.json',
} as const;

export const TRAVEL_OVERVIEW_CONFIG = {
  // Resting globe ground (globe.vert/.frag, landShading.glsl); the riding landscape takes the same shade and tint.
  relief: 0.012, // surface height at the highest ground, share of the radius
  shade: 0, // hillshade strength; off for the night globe
  landTint: 0.015, // land lightening with height
  trailRadius: 0.0035, // trail tube radius, share of the globe radius
  markerSize: 14, // CSS pixels: every trip's reticle (TravelCallouts.tsx); the diamond is half
  clusterWithin: 3.5, // degrees: trips nearer than this (chained) share one marker that fans out on a click
  phoneClusterWithin: 9, // degrees, on phones: the globe is drawn about half the size, so more trips share a marker

  // Orbit rings (TravelRings.tsx), outside the globe's turn; in with the lines, gone while a trip is open.
  // Per ring: radius (share of the globe's), arcs with gap degrees between, a fainter inner track when double,
  // ticks (every sixth longer), spin in degrees per second about its own axis. Their tilts are tuned apart.
  rings: [
    {radius: 1.28, arcs: 4, gap: 14, ticks: 72, double: false, spin: 2},
    {radius: 1.42, arcs: 1, gap: 0, ticks: 90, double: false, spin: -1.2},
  ] as readonly {radius: number; arcs: number; gap: number; ticks: number; double: boolean; spin: number}[],
  innerRingTilt: [-197.799805, 117.800018] as readonly [number, number], // the first ring's tilt about x and z, degrees
  outerRingTilt: [-20.799561, -20.999817] as readonly [number, number], // the second ring's
  ringIntensity: 0.4, // ring brightness
  ringDragGain: 0.12, // extra spin multiples per degree per second the globe turns, signed with the turn

  // Turning by hand (TravelGlobe.tsx -> lib/scene/travel.ts advanceGlobe): drag, coast, capture, drift.
  dragGain: 0.9, // surface speed as a share of the pointer's
  friction: 2.3, // release velocity decay, per second
  snapBelow: 5, // degrees per second; slower coasting lets the nearest trip take over
  capture: 35, // degrees from the globe's front a trip can capture from
  snapRate: 2, // share of the remaining error the capture servo closes per second
  idleDrift: 3, // degrees per second while untouched and resting on no trip
  idleAfter: 2, // seconds untouched before drifting

  // Focus (TravelGlobe.tsx -> lib/scene/travel.ts focusedTrip): a trip near the globe's centre shows its open cue,
  // by where the globe stands alone, apart from the capture servo.
  focusWithin: 22, // degrees from the globe's front; a focused trip keeps focus until 5 degrees past it

  // Phones: the camera's step back as the trip list is pulled up, and forward as it is let down (CameraRig
  // 'travelIndex'); the sheet rises over the same time (Travel.css --travel-sheet-move).
  indexSeconds: 0.55,
} as const;

export const TRAVEL_TRIP_CONFIG = {
  // Framing: the trip turns to its marker point while the camera moves to the trip pose (camera.ts travelTrip*).
  markerOffset: [0.693, 0.774] as readonly [number, number], // right and up of centre, shares of the radius
  phoneMarkerOffset: [0, -0.5] as readonly [number, number], // phones: below centre, just above the trip's sheet
  holdRate: 2, // share of the remaining error the servo closes per second holding the trip

  // Journey between the overview and a trip, either way (CameraRig 'travelFocus'); the look eases over it too.
  focusSeconds: 1.2,
  turnFrom: 0.3, // share of the journey the globe holds before turning
  turnSettle: 0.6, // seconds the turn settles past the camera's landing
  revealAt: 0.75, // share of the return turn before the rings, other markers and titles come back
  stopsFrom: 0.85, // share of the journey in before the trip's stops fade in (they leave as the return starts)

  // Raised-relief map (globe.vert/.frag); replaces the overview's ground. Trails, lights and markers ride it.
  summaryBlur: 0.1, // elevation blur radius in texels, three box passes; 0 keeps the full map (useElevation.ts)
  relief: 0.026, // surface height at the highest ground, share of the radius
  shade: 0.25, // hillshade strength
  landTint: 0.08, // land lightening with height
  trailRadius: 0.0014, // trail tube radius, share of the globe radius; thinner up close
  markerSize: 38, // CSS pixels, the open trip's markers; larger up close
} as const;
