// The lake on the homepage terrain and the dive beneath it (stage 3, docs/todos/stage-3-lake-exploration.md).
// The lake is a water surface over the plain's central basin at the foot of the overview, its near half below
// the frame's bottom edge (the sketch in docs/todos/assets/lake-brief.jpg); the dive is a procedural crack, seen
// through sonar pings only. Loaded by node scripts, so keep imports type-only.
import type {Vector3Tuple} from 'three';

export const LAKE_CONFIG = {
  // The water: a flat surface at `level` over the plain's central basin, cut wherever the ground rises above it,
  // so the shore is the ground's own contour at that level (the terrain is never reshaped for it). The level is
  // one of the drawn contour levels (CONTOUR_CONFIG, jittered; the bake's own arithmetic gives them), so a
  // contour line runs along the shore. `center` is the lake's heart in the overview: the dive begins under it
  // and its controls sit about it. The basin runs open toward the camera and westward to the map's edge, so the
  // water disc covers the whole of it (`disc`) with room to spare, the basin's flanks cutting the water's sides;
  // the disc's own edge lies off the map, where the terrain's edge fade has already hidden the water.
  center: [4.3, 1.4] as readonly [number, number],
  level: 7.65, // contour 6, a major line
  disc: {
    center: [-1, -3] as readonly [number, number],
    radii: [11, 9] as readonly [number, number],
  },
  // Where the HTML controls (the dive button, the letter) sit on phones, from the lake's centre: phones frame the
  // plain from the side (CAMERA_CONFIG.mobileOverviewPosition), with the scene text standing in the water, so
  // there the controls sit at the lake's west end, clear of the columns. Wider screens put them in the middle of
  // the water as framed (LakeSurface). The water itself takes a click anywhere.
  mobileControlOffset: [-2.4, -0.9] as readonly [number, number],
  // Colours (the site's gold and cyan; tokens.css --color-accent for the gold).
  gold: '#e8c77a',
  cyan: '#7fe3ea',
  water: '#05070d',
  // The camera's pose above the lake at the end of the entry flight, looking down into the water: offsets from
  // the lake's centre and level. It keeps the overview's heading (CAMERA_CONFIG.overviewPosition looks along
  // about (-0.29, 0.96) on the plain), only pitched down, so the flight dives straight ahead rather than
  // swinging round to look back across the lake.
  diveOffset: [0.43, 2.5, -1.44] as Vector3Tuple,
  diveLookOffset: [0, 0, 0] as Vector3Tuple,
} as const;

/** The lake's place and the entry flight's pose over it. */
export function lakePlacement() {
  const {center, level} = LAKE_CONFIG;
  const [ox, oy, oz] = LAKE_CONFIG.diveOffset;
  const [lx, ly, lz] = LAKE_CONFIG.diveLookOffset;
  return {
    center,
    level,
    disc: LAKE_CONFIG.disc,
    divePosition: [center[0] + ox, level + oy, center[1] + oz] as Vector3Tuple,
    diveLookAt: [center[0] + lx, level + ly, center[1] + lz] as Vector3Tuple,
  };
}

export type LakePlacement = ReturnType<typeof lakePlacement>;

// The flow between the overview and the dive, in seconds. The shell's timers and the camera's flights read the
// same numbers, so the veil goes dark exactly as the camera reaches the water.
export const LAKE_FLOW = {
  entryFlight: 2.6, // overview to the water
  entryVeilAt: 1.9, // the veil starts to darken, black by the end of the flight
  veilDown: 0.7,
  veilUp: 1.1,
  surfaceVeil: 0.6, // the veil darkens over the crack
  returnFlight: 2.2, // the water back to the overview
  breachHold: 2.4, // seconds of the dead screen after the hull gives out, before the veil
} as const;

export const LAKE_DIVE_CONFIG = {
  // The crack: a steep slot winding down from under the lake. Units are landscape units; metresPerUnit scales the
  // HUD's numbers.
  seed: 7,
  length: 588, // arc length of the route, units
  stationSpacing: 0.25, // spacing of the sampled frames along the route (the walls' relief is sampled as finely)
  controlStep: 12, // spacing of the route's control points
  pitch: 0.55, // radians below horizontal the route descends at, on average (gentle: the faces stand up)
  pitchWander: 0.12,
  yawWander: 0.3, // radians the route's bend may change per control step
  yawBend: 0.28, // radians per control step the route bends at most
  straightEnd: 72, // units of straight run into the basin, so the open water shows ahead
  // Cross-section: a trench. Two rock faces either side of the route, half the gap between them in halfWidth;
  // the floor and the ceiling (the lake bed) lie halfHeight away, far beyond the sonar, so above and below is
  // void. slotPower squares the slot off: the faces stay near-vertical most of their height.
  halfWidth: [2.4, 3.8] as readonly [number, number],
  halfHeight: [34, 46] as readonly [number, number],
  slotPower: 4,
  // The walls are bedded rock, broken at every height: faces leaning back or overhanging, broad bulges, spurs
  // running slantwise down them, rounded buttresses and alcoves several units across, shelves where the beds
  // change, and a little finer roughness; all of it in the mesh, so the craft's clearance and the readouts see the
  // same rock the sonar does. The finest grain is the scanned rock below. Amounts are shares of the gap's half-width.
  wallLean: 0.36, // units a face steps back per unit up, at most; now and then it overhangs a little
  wallLeanDetail: 0.035, // how quickly the lean changes along the route, per unit
  riseScale: 6, // units up a face beyond which its forms grow broader with height
  wallNoise: 0.45, // the broad bulges
  wallDetail: 0.07, // their frequency along the route
  wallSpur: 0.4, // the slanting spurs
  wallSpurDetail: 0.09, // their frequency across the face
  wallMid: 0.32, // the buttresses and alcoves
  wallMidDetail: 0.11, // their frequency, per unit
  wallRoughness: 0.02, // the finer bulges
  terraceSpacing: 8, // units of height between the walls' shelves
  terrace: 0.14, // how far the shelves stand in and out
  // The scanned rock laid on the walls (public/textures/lake, packed by scripts/lake/pack-rock.mjs): a normal map
  // tilting the shading, a height map pushing the vertices, and its occlusion holding back the return in crevices.
  rockTexture: '/textures/lake/cliff-1k.webp',
  rockScale: 0.16, // repeats of the map per unit: a block in the scan is about a unit on the wall
  rockDetailScale: 0.55, // the finer repeat, for rock close by
  rockBump: 1.4, // how much the map's normal tilts the wall's
  rockRelief: 0.16, // units the height map pushes the vertices, at most (well under `margin`)
  rockOcclusion: 0.7, // how much the map's crevices hold back the return
  // Pinches: narrow passages at these shares of the route, their gap scale and spread in units.
  pinches: [
    [0.1, 0.74, 8], [0.19, 0.7, 9], [0.3, 0.76, 7], [0.4, 0.68, 8], [0.5, 0.72, 9], [0.59, 0.7, 7], [0.69, 0.68, 8],
  ] as readonly (readonly [number, number, number])[],
  // The basin: over the last `basin` units the faces fall away to `basinHalfWidth` either side, beyond the
  // sonar's reach, a floor comes up to `basinDepth` below the route (the void above stays) and the route levels
  // to `basinPitch`. Open water: a scan shows a short stretch of the seafloor and nothing else, the walls and
  // the far end lost in the void. The bottle rests on that floor.
  basin: 60,
  basinTail: 70, // units the open water runs on past the craft's end, so its far wall is never within a scan
  floorRise: 70, // units of route before the basin over which its floor comes up from the void, a gentle slope
  basinHalfWidth: 70,
  basinDepth: 8,
  basinPitch: 0.3, // radians below horizontal across the basin
  ringSegments: 320, // vertices around each ring: dense up the faces near the gap, sparse toward the void
  drawReach: 70, // units of route either side of the craft whose walls are drawn: beyond, the water has them
  metresPerUnit: 10,

  // The craft: fixed speed, direction by the player alone (nothing steers for them); slower in the basin, so
  // there is time to search the floor for the bottle.
  speed: 2.4, // units per second
  basinSpeed: 0.7, // share of the speed kept in the basin
  turnRate: 0.6, // radians per second of yaw at full input: a press moves the view a little
  pitchRate: 0.45,
  turnDamping: 9, // per second: answers at once, with a touch of softness
  // Radians of pitch either way: steep, but short of vertical, where a turn of the yaw would only spin the view
  // about its own axis (the heading is yaw and pitch, so straight up or down has no turn left in it).
  pitchRange: [-1.1, 1.1] as readonly [number, number],
  margin: 0.7, // clearance kept from the wall
  collisionStep: 0.3, // units of movement per collision check, so a fast move cannot slip through a face
  bumpSlow: 0.25, // speed kept on a bump: a knock nearly stops the craft
  bumpRecover: 0.7, // per second, so the speed takes a few seconds to come back
  bumpKick: 0.1, // radians the view is knocked over by a hit
  // The hull: integrity runs from 1 to 0 over the dive and is never repaired in it; at 0 the dive ends. A fresh
  // knock costs `hullHit` once its impact (the share of full speed carried into the face) reaches
  // `hullFullImpact`, and never less than `hullGraze` of that for the lightest touch, so six or seven knocks
  // break it; staying pressed against the rock costs `hullScrape` a second, so a slide along a wall is no free way
  // down.
  hullHit: 0.17,
  hullGraze: 0.5,
  hullFullImpact: 0.4, // a deliberate ram carries 0.2 to 0.4 of full speed into the face
  hullScrape: 0.015,
  hullCritical: 0.3, // below this the system warns even off the wall
  contactGrace: 0.4, // seconds clear of the rock before a contact counts as a fresh knock (and the alarm stops)
  breachList: 0.22, // radians the dead craft lists to as it drifts after a breach
  slideEase: 5, // per second: how quickly the heading turns along a wall it is pressed against
  lookEase: 30, // per second, the camera's lag behind the heading (none felt)
  lean: 0.09, // radians of roll per radian per second of yaw
  reach: 5, // units from the bottle that end the dive whatever the scan showed
  foundRange: 14, // units from the bottle within which a scan that has reached it ends the dive
  foundCone: 0.75, // cosine of the angle off the heading the bottle must lie within for that: the player must
  // have turned toward it on the floor, its halo their guide
  soundVolume: 0.6, // the sonar's loudness, 0 for silence
  // A recorded ping to play instead of the synthesised one: a file under public/ (for example
  // '/lake/sonar.mp3'); empty keeps the synthesised ping.
  soundSrc: '',

  // Sonar: a ping's front travels out at `pingSpeed`; what it has passed decays over `pingDecay` seconds; its
  // return weakens with distance over `pingRange`. Pings are the player's alone, on a cooldown the HUD shows.
  pingSpeed: 14, // units per second
  pingDecay: 1, // seconds: what a ping showed is back to black soon after
  pingRange: 24, // units
  floorRange: 0.2, // share of pingRange the seafloor returns over: a scan shows only a short stretch of it
  haloReach: 9, // units within which the bottle's own light (and its halo) shows; further off, the water is void
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
  // SMAA's edge threshold under water (its usual is 0.1, on linear colour): the walls are dim against black water.
  edgeThreshold: 0.02,
} as const;
