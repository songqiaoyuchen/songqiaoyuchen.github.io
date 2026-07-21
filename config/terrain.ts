import type { Vector3Tuple } from 'three';

export const TERRAIN_CONFIG = {
  camera: {
    position: [5.097, 13.444, -6.564] as Vector3Tuple,
    lookAt: [-0.219, -0.322, 0.921] as Vector3Tuple,
    target: [2.771, 10.028, 3.214] as Vector3Tuple,
    fov: 50,
  },

  fog: {
    color: '#0a0a0a',
    near: 7.5,
    far: 21,
  },

  mesh: {
    position: [0, -0.5, 0] as Vector3Tuple,
    segments: 512,
    planeSize: 22,
    // Normalized inward fade on every side, hiding the finite plane boundary.
    edgeFeather: 0.12,
  },

  // Contour lines: real polylines extracted from the smoothed shell height
  // field (marching squares) and expanded into thin tubes, Lusion-style.
  // Lines float above the terrain via lift + a screen-space depth bias.
  contours: {
    lift: 0,           // world-units raised above the base surface
    smoothIterations: 8,  // Laplacian passes on the shell field
    smoothFactor: 1.0,    // Laplacian smoothing strength

    // extraction / geometry (changes rebuild the tube geometry)
    levels: 24,           // contour elevations across normalized height
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
    bloomIntensity: 3,
    bloomThreshold: 0.4,   // only the selected contour pass is allowed to glow
    bloomSmoothing: 0.12,  // a tighter knee preserves the dark terrain around it
  },

  material: {
    elevation: 24.3,
    contrast: 1.8,
    seaLevel: 0,
    baseColor:      '#080b17',
    ridgeColor:     '#a39144',

    // Primary point source. Coordinates are world-space with Y up.
    lightX: 1.6,
    lightY: 7.3,
    lightZ: -0.2,
    lightColor: '#fef2ff',
    lightIntensity: 1.05,
    lightFalloff: 0.053,  // tighter pool of light with a faster fall into black

    // Independently tuned counter light. It uses the same hard diffuse
    // response and terrain-shadow model as the primary.
    light2X: 7.6,
    light2Y: 7.8,
    light2Z: 1.1,
    light2Color: '#fef2ff',
    light2Intensity: 1.45,
    light2Falloff: 0.065,

    // Height-field ray shadow. These stay as uniforms so future section looks
    // can animate them without replacing or recompiling the material.
    shadowStrength: 0.81,
    shadowBias: 0.09,
  },
}
