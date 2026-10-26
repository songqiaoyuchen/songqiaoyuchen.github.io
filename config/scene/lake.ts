// The lake on the homepage terrain and the dive beneath it (stage 3, docs/todos/stage-3-lake-exploration.md).
// The lake is a water surface laid over the open plain in the lower middle of the overview; the dive is a
// procedural crack, seen through sonar pings only. Loaded by node scripts, so keep imports type-only.
import type {Vector3Tuple} from 'three';

export const LAKE_CONFIG = {
  // The water: a flat surface at `level` over the plain, cut to an irregular ellipse (noise moves the shore in and
  // out by `shoreNoise` of the radius); the terrain's own depth cuts the shores where the ground rises above it.
  center: [3.6, 3.2] as readonly [number, number],
  level: 7.86,
  radii: [2.05, 1.45] as readonly [number, number],
  shoreNoise: 0.14,
  // Colours (the site's gold and cyan; tokens.css --color-accent for the gold).
  gold: '#e8c77a',
  cyan: '#7fe3ea',
  water: '#05070d',
  // The camera's pose above the lake at the end of the entry flight, looking down at the water.
  divePosition: [3.6, 10.6, 4.35] as Vector3Tuple,
  diveLookAt: [3.6, 7.86, 3.0] as Vector3Tuple,
} as const;

// The flow between the overview and the dive, in seconds. The shell's timers and the camera's flights read the
// same numbers, so the veil goes dark exactly as the camera reaches the water.
export const LAKE_FLOW = {
  entryFlight: 2.6, // overview to the water
  entryVeilAt: 1.9, // the veil starts to darken, black by the end of the flight
  veilDown: 0.7,
  veilUp: 1.1,
  surfaceVeil: 0.6, // the veil darkens over the crack
  returnFlight: 2.2, // the water back to the overview
} as const;

export const LAKE_DIVE_CONFIG = {
  // The crack: a steep slot winding down from under the lake. Units are landscape units; metresPerUnit scales the
  // HUD's numbers.
  seed: 7,
  length: 150, // arc length of the route, units
  stationSpacing: 0.25, // spacing of the sampled frames along the route (the walls' relief is sampled as finely)
  controlStep: 12, // spacing of the route's control points
  pitch: 0.55, // radians below horizontal the route descends at, on average (gentle: the faces stand up)
  pitchWander: 0.12,
  yawWander: 0.3, // radians the route's bend may change per control step
  yawBend: 0.28, // radians per control step the route bends at most
  straightEnd: 36, // units of straight run into the chamber, so its end wall shows ahead
  // Cross-section: a trench. Two rock faces either side of the route, half the gap between them in halfWidth;
  // the floor and the ceiling (the lake bed) lie halfHeight away, far beyond the sonar, so above and below is
  // void. slotPower squares the slot off: the faces stay near-vertical most of their height.
  halfWidth: [2.4, 3.8] as readonly [number, number],
  halfHeight: [34, 46] as readonly [number, number],
  slotPower: 4,
  // The walls are bedded rock: broad bulges, then blocks and spalls a unit or two across, ledges where the beds
  // step, and a little finer roughness; all of it in the mesh, so the craft's clearance and the readouts see the
  // same rock the sonar does. The finest grain is the scanned rock below.
  wallNoise: 0.26, // how much the wall surface departs from the ellipse, at the large scale
  wallDetail: 0.07, // noise frequency along the route
  wallMid: 0.17, // the blocks and spalls, as a share of the radius
  wallMidDetail: 0.45, // their frequency, per unit
  wallRoughness: 0.025, // the finer bulges
  terraceSpacing: 3.6, // units of height between the walls' ledges
  terrace: 0.09, // how far the ledges step in and out, as a share of the radius
  // The scanned rock laid on the walls (public/textures/lake, packed by scripts/lake/pack-rock.mjs): a normal map
  // tilting the shading, a height map pushing the vertices, and its occlusion holding back the return in crevices.
  rockTexture: '/textures/lake/cliff-1k.webp',
  rockScale: 0.16, // repeats of the map per unit: a block in the scan is about a unit on the wall
  rockDetailScale: 0.55, // the finer repeat, for rock close by
  rockBump: 1.4, // how much the map's normal tilts the wall's
  rockRelief: 0.16, // units the height map pushes the vertices, at most (well under `margin`)
  rockOcclusion: 0.7, // how much the map's crevices hold back the return
  // Pinches: narrow passages at these shares of the route, their gap scale and spread in units.
  pinches: [[0.3, 0.72, 9], [0.62, 0.75, 7], [0.82, 0.68, 8]] as readonly (readonly [number, number, number])[],
  chamber: 14, // units of widened chamber at the end, where the bottle rests
  ringSegments: 320, // vertices around each ring: dense up the faces near the gap, sparse toward the void
  metresPerUnit: 10,

  // The craft: fixed speed, direction by the player alone (nothing steers for them); slower in the chamber, so
  // there is time to aim at the bottle.
  speed: 2.4, // units per second
  chamberSpeed: 0.5, // share of the speed kept in the chamber
  turnRate: 0.6, // radians per second of yaw at full input: a press moves the view a little
  pitchRate: 0.45,
  turnDamping: 9, // per second: answers at once, with a touch of softness
  pitchRange: [-1.5, 1.5] as readonly [number, number], // radians: near-vertical either way; yaw is free
  margin: 0.7, // clearance kept from the wall
  collisionStep: 0.3, // units of movement per collision check, so a fast move cannot slip through a face
  bumpSlow: 0.25, // speed kept on a bump: a knock nearly stops the craft
  bumpRecover: 0.7, // per second, so the speed takes a few seconds to come back
  bumpKick: 0.1, // radians the view is knocked over by a hit
  slideEase: 5, // per second: how quickly the heading turns along a wall it is pressed against
  lookEase: 30, // per second, the camera's lag behind the heading (none felt)
  lean: 0.09, // radians of roll per radian per second of yaw
  reach: 5, // units from the bottle that end the dive whatever the scan showed
  foundRange: 26, // units from the bottle within which a scan that has reached it ends the dive
  foundCone: 0.55, // cosine of the angle off the heading the bottle must lie within for that
  soundVolume: 0.6, // the sonar's loudness, 0 for silence
  // A recorded ping to play instead of the synthesised one: a file under public/ (for example
  // '/lake/sonar.mp3'); empty keeps the synthesised ping.
  soundSrc: '',

  // Sonar: a ping's front travels out at `pingSpeed`; what it has passed decays over `pingDecay` seconds; its
  // return weakens with distance over `pingRange`. Pings are the player's alone, on a cooldown the HUD shows.
  pingSpeed: 14, // units per second
  pingDecay: 1, // seconds: what a ping showed is back to black soon after
  pingRange: 24, // units
  pingCooldown: 5, // seconds between pings
  firstPingAt: 0.8, // seconds into the dive before the one ping sent for the player
  maxPings: 6,
  depthLines: 2.5, // units between the depth lines drawn on the walls
  // The walls' resting light: a faint glow on surfaces within `ambientReach` units, nothing beyond.
  ambient: 0.025,
  ambientReach: 3.5,
  readoutRange: 40, // units the readouts measure to a wall
  // Under water the canvas renders at no more than this pixel ratio (the overview's own is restored on surfacing):
  // the dive is dark and soft, and its walls are drawn twice (once for the bloom), so pixels are its main cost.
  maxPixelRatio: 1.25,
} as const;
