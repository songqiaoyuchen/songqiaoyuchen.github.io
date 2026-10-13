// Contour lines: polylines marched from the smoothed height field, drawn as thin glowing tubes.
// Geometry keys are baked offline (npm run bake:terrain); dev-config writes the Leva keys here.
// Lines float above the terrain via lift plus a screen-space depth bias.
export const CONTOUR_CONFIG = {
  lift: 0, // world-units raised above the base surface
  smoothIterations: 8, // Laplacian passes on the shell field
  smoothFactor: 1.0, // Laplacian smoothing strength

  // Extraction and geometry; changing these values rebuilds tube geometry.
  levels: 24, // contour elevations across normalized height
  downsample: 2, // extraction grid downsample vs the shell grid
  rdpEpsilon: 0.012, // simplification tolerance, world units
  chaikinIterations: 3, // corner-cutting smoothing passes
  resampleSpacing: 0.06, // uniform point spacing, world units
  minLength: 0.5, // drop lines shorter than this, world units

  // Level gaps are jittered but bounded, and some major lines receive a
  // faint shadow companion below them.
  spacingJitter: 0.5, // fraction of the base gap between levels
  shadowChance: 0.6, // probability a major gets a shadow companion
  shadowOffset: 0.3, // companion gap below a major, fraction of its slot
  shadowIntensity: 0.55, // companion brightness (live uniform, no rebuild)

  majorEvery: 3, // every Nth contour level is the bright major one
  majorMinHeight: 0.15, // no major lines below this normalized height
  minorRadius: 0.008, // tube radius, world units
  majorRadius: 0.01,
  depthBias: 0.001, // constant normalized-device-depth pull

  minorColor: '#cda84d',
  minorIntensity: 0.65,
  minorBase: 0.3, // resting brightness of thin lines under the pulse
  majorColor: '#ffe4a4',
  majorIntensity: 0.95,

  // Hard-edged highlight running along each thin line.
  pulseColor: '#ffe2bf',
  pulseTint: 0.4, // how much the pulse recolors the line
  pulseSpeed: 0.7, // world units per second along the line
  pulseScale: 1, // noise frequency along arc length
  pulseSharpness: 0.25, // 1 = distinct borders, 0 = smooth gradient

  // The intro reveal: a wave spreads from the summit over the ground (by surface distance, over the hills) and
  // each line shows where it has passed, a faint ghost ahead of it and a flash just behind its front (IntroReveal,
  // lib/terrain/reach.ts, contours.vert/.frag).
  // The wave starts at the highest point within revealOriginRadius of this plan point (world x, z): the ridge the
  // overview camera looks at (CAMERA_CONFIG.overviewLookAt), not the terrain's far-off true summit.
  revealOriginX: 3.4,
  revealOriginZ: 3,
  revealOriginRadius: 3,
  revealDelay: 0.2, // seconds after the intro starts before the wave sets off
  revealSpeed: 4, // world units of surface per second
  revealGhost: 0.25, // brightness of a line ahead of the wave
  revealGhostUnits: 2, // from how far ahead the ghost fades in, world units
  revealFlash: 0.9, // brightness the flash behind the front adds
  revealFlashUnits: 1.5, // over what distance behind the front it decays, world units
  revealFlashRadius: 0.45, // how much wider the tube is at the flash's peak
} as const;
