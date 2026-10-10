// Travel globe: where it hangs in the scene, how it looks, how it turns and settles, and how a selected trip is
// framed. Leva's Travel folder saves most keys here; the camera poses live in config/scene/camera.ts.
// Type-only imports keep this file loadable by the node scripts in scripts/test.
import type {Vector3Tuple} from 'three';

export const TRAVEL_CONFIG = {
  // The globe sits above the terrain's centre, so the Travel pose looks over the landscape at it.
  center: [0, 17, 0] as Vector3Tuple,
  radius: 3,

  // Look B: a night globe. The dark ground with a gold rim, land a field of gold light points (TravelLights),
  // faint coastlines and graticule, two orbit rings with tick marks about it (TravelRings) and stars behind
  // (TravelStars); the trail colour shared with About.
  baseColor: '#0b0d14',
  rimColor: '#e8c77a',
  rimIntensity: 0.45,
  lineColor: '#e8c77a',
  graticuleStep: 15, // degrees between meridians and parallels
  graticuleIntensity: 0.08,
  coastIntensity: 0.3,
  // Lights: the share of candidate land points kept, their size in CSS pixels at full brightness, and when they
  // come in on the way (share of the journey).
  lightDensity: 0.5,
  lightSize: 4,
  lightsIn: [0.15, 0.55] as readonly [number, number],
  // Stars: how many, how far from the globe's centre, their size, and when they come in.
  starCount: 1400,
  starRadius: 60,
  starSize: 3.2,
  starsIn: [0.5, 0.9] as readonly [number, number],
  // Orbit rings: radius as a share of the globe's; the ring drawn as arcs (count) with gaps (degrees) between,
  // each arc brightening along its length like a sweep, with a fainter inner track (double); tick count (every
  // sixth longer); tilt about x and z in degrees; spin in degrees per second about the ring's own axis, which
  // never moves. They come in with the lines (linesIn), leave while a trip is open, and spin faster as the globe
  // is turned (ringDragGain: extra multiples of their spin per degree per second of the globe's yaw).
  rings: [
    {radius: 1.28, arcs: 4, gap: 10, ticks: 72, double: true, tilt: [76, -14], spin: 2},
    {radius: 1.42, arcs: 1, gap: 0, ticks: 180, double: false, tilt: [99, 29], spin: -1.2},
  ] as readonly {
    radius: number; arcs: number; gap: number; ticks: number; double: boolean; tilt: readonly [number, number];
    spin: number;
  }[],
  ringIntensity: 0.85,
  ringDragGain: 0.04,
  trailColor: '#8fe3d6',
  trailRadius: 0.0035, // share of the globe radius
  trailLift: 0.004, // share of the globe radius above the surface
  dashLength: 0.03, // world units per dash and gap of a dotted connector
  trailStep: 0.5, // degrees between samples along a track

  // Rotation feel (the plan page demo's defaults). Angles in degrees, speeds in degrees per second.
  dragGain: 0.9, // surface follows the pointer at this share of its speed
  friction: 1.2, // exponential decay of the release velocity, per second
  snapBelow: 5, // coasting slower than this lets the nearest trip take over
  capture: 35, // ...if it lies within this angle of the globe's front
  snapRate: 2, // the servo closes this share of the remaining error per second
  maxPitch: 80, // the poles never tip past this
  idleDrift: 3, // slow turn while untouched and resting on no trip
  idleAfter: 2, // seconds untouched before drifting

  // A captured or selected trip turns to markerOffset from the globe's centre on screen (right and up, as shares
  // of its radius), whatever the composition. A selected trip also moves the camera to the trip pose
  // (config/scene/camera.ts travelTrip*, saved with Save Camera while a trip is open).
  markerOffset: [0.693, 0.774] as readonly [number, number],
  // Camera journey times: into or out of Travel, and between the overview and a trip.
  journeySeconds: 2,
  focusSeconds: 1.2,

  // Relief from the baked elevation image: how far the surface stands off the sphere at the highest ground
  // (share of the radius), the hillshade strength (off: the night globe has no shaded relief) and the land tint
  // (shaders/terrain/landShading.glsl, shared with the terrain and the regional ground on the way in).
  relief: 0.012,
  shade: 0,
  landTint: 0.015,

  // Entry from the landscape, one continuous zoom-out. The landscape stands for landscapeKm of real ground, which
  // sizes the planet it sits on (Earth-sized at that scale: lib/scene/travel.ts planetScale); the planet shrinks
  // geometrically to the globe over the journey while the terrain and the baked ground around it (region*) ride
  // on its surface at the matching scale, heights measured above sea level. Haze thins between hazeOut[0] and
  // hazeOut[1] of the journey (fog distances grow hazeFactor-fold); lines and trails come in between linesIn[0] and
  // linesIn[1]; the globe's relief goes from physical to its map exaggeration between reliefIn[0] and [1]. The
  // terrain may be shrunk away early from vanish (1 leaves it to the scale alone); patchRelief exaggerates its
  // height on the way. The landscape's pool of light gives way to the globe's land shading between landIn[0]
  // and landIn[1], the regional ground around it brightening out of the dark on the same ramp, so the two are
  // lit as one.
  landscapeKm: 20,
  patchRelief: 1,
  vanish: 1,
  landIn: [0.03, 0.18] as readonly [number, number],
  linesIn: [0.75, 0.97] as readonly [number, number],
  trailsIn: [0.85, 1] as readonly [number, number],
  hazeOut: [0.15, 0.8] as readonly [number, number],
  hazeFactor: 60,
  reliefIn: [0.85, 1] as readonly [number, number],
  // The elevation map's top in metres (NASA's topography image is linear and saturates near 4,600 m: Chengdu 500 m
  // reads 28, the plateau edge 3,256 m reads 183), and the real relief that makes: that height over Earth's radius.
  elevationTopMetres: 4600,
  physicalRelief: 4600 / 6371000,
  // The tile's slopes are gentler per texel than the global map's; this scales its hillshade to read the same.
  regionSlopeGain: 1,

  // Baked geography (scripts/assets/build-travel-geo.mjs); missing files are fine, the globe stays bare and the
  // zoom-out has no ground around the landscape.
  coastSrc: '/travel/coast.bin',
  elevationSrc: '/travel/elevation.png',
  regionSrc: '/travel/region.png',
  regionMetaSrc: '/travel/region.json',
} as const;
