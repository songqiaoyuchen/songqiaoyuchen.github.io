import type { Vector3Tuple } from 'three';

export const TERRAIN_CONFIG = {
  camera: {
    position: [5.295, 10.37, -7.092] as Vector3Tuple,
    lookAt: [-0.238, -0.032, 0.971] as Vector3Tuple,
    target: [2.771, 10.028, 3.214] as Vector3Tuple,
    fov: 50,
  },

  fog: {
    color: '#0a0a0a',
    near: 8.5,
    far: 12,
  },

  mesh: {
    position: [0, -0.5, 0] as Vector3Tuple,
    segments: 512,
    planeSize: 22,
  },

  // Contour lines: real polylines extracted from the smoothed shell height
  // field (marching squares) and expanded into thin tubes, Lusion-style.
  // Lines float above the terrain via lift + a screen-space depth bias.
  contours: {
    lift: 0,           // world-units raised above the base surface
    smoothIterations: 8,  // Laplacian passes on the shell field
    smoothFactor: 1.0,    // Laplacian smoothing strength

    // extraction / geometry (changes rebuild the tube geometry)
    levels: 25,           // contour elevations across normalized height
    downsample: 2,        // extraction grid downsample vs the shell grid
    rdpEpsilon: 0.012,    // simplification tolerance, world units
    chaikinIterations: 3, // corner-cutting smoothing passes
    resampleSpacing: 0.06, // uniform point spacing, world units
    minLength: 0.5,       // drop lines shorter than this, world units

    // Irregular spacing (Blender-reference feel): level gaps are jittered but
    // bounded — a gap never exceeds (1+jitter)× the base gap, so spacing
    // varies without wide voids — and some majors get a faint "shadow"
    // companion a bit below.
    spacingJitter: 0.5,    // ± fraction of the base gap between levels
    shadowChance: 0.6,     // probability a major gets a shadow companion
    shadowOffset: 0.3,     // companion gap below a major, fraction of its slot (±25% varied)
    shadowIntensity: 0.55, // companion brightness (live uniform, no rebuild)

    majorEvery: 3,        // every Nth contour level is the bright major one
    majorMinHeight: 0.15, // no major lines below this normalized height
    minorRadius: 0.008,   // tube radius, world units
    majorRadius: 0.01,
    depthBias: 0.001,     // constant normalized-device-depth pull

    minorColor: '#cda84d',
    minorIntensity: 0.65,
    minorBase: 0.3,       // resting brightness of thin lines under the pulse
    majorColor: '#ffe4a4',
    majorIntensity: 0.95,

    // pulse: hard-edged highlight running along each thin line
    pulseColor: '#ffe2bf',
    pulseTint: 0.4,       // how much the pulse recolors the line
    pulseSpeed: 0.7,      // world units per second along the line
    pulseScale: 1,        // noise frequency along arc length
    pulseSharpness: 0.25, // 1 = distinct borders, 0 = smooth gradient

    // Intro: all contours start together and alternate path direction by
    // elevation. The front moves at the same world-space speed on every line.
    introTravelSpeed: 4,  // world units per second
  },

  // Post-processing: bloom is what gives the lines their hot flat cores and
  // organic glow falloff (Lusion pushes bloom hard — up to ~12 in map mode).
  post: {
    bloomIntensity: 4.5,
    bloomThreshold: 0.45,  // luminance below this doesn't glow
    bloomSmoothing: 0.3,   // softness of the threshold knee
  },

  material: {
    elevation: 24,
    contrast: 1.8,
    seaLevel: 0,
    baseColor:      '#080b17',
    ridgeColor:     '#a39144',
    lightAzimuth:   0,
    lightElevation: 70,
    lightIntensity: 0.65,
  },
}
