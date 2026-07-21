import type { Vector3Tuple } from 'three';

export const TERRAIN_CONFIG = {
  camera: {
    position: [5.799, 13.579, -6.321] as Vector3Tuple,
    lookAt: [-0.285, -0.334, 0.898] as Vector3Tuple,
    target: [2.771, 10.028, 3.214] as Vector3Tuple,
    fov: 50,
  },

  fog: {
    color: '#0a0a0a',
    near: 7.5,
    far: 16.5,
  },

  mesh: {
    position: [0, -0.5, 0] as Vector3Tuple,
    segments: 512,
    planeSize: 22,
    // Fraction of the terrain width feathered into the scene background at
    // each physical edge. Applied to both the surface and contour geometry.
    edgeFadeWidth: 0.12,
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

  // Descent (H-007): GSAP ScrollTrigger owns the scroll-bound transition from
  // the hero pose to a near-orthographic top-down map.
  descent: {
    scrollSvh: 180,  // scroll distance (svh) that plays the full descent
    // Fully flattened, unwashed stage-2 runway reserved for the experience
    // timeline DOM/SVG overlay. Stage 3 must remain below the viewport here.
    mapHoldSvh: 100,
    // One viewport keeps stage 3 below the fold until the wash starts, then
    // brings it to the top exactly as the canvas becomes fully covered.
    washSvh: 100,
    // The flat artwork composition occupies one viewport before it gives way
    // to the normally scrolling frog and colophon.
    projectSvh: 100,

    // Stage-2 framing: X/Z choose the terrain point at the centre of the map,
    // Y and FOV choose its scale, and heading rotates the map in the viewport.
    // The camera still looks straight down; this preserves the map-like read.
    descentEndX: 4.8,
    descentEndY: 21.6,
    descentEndZ: 0.3,
    descentEndFov: 50, // matches hero FOV; retained as a Leva framing control
    descentEndHeading: -93, // degrees clockwise from map-north (+Z) up
    // Reach the top-down crop before the final rise clears the wider map fog.
    mapPoseCompleteAt: 0.82,
    descentBow: -2.9,     // sideways (+X) bulge of the rise path midpoint
    scrollScrubSeconds: 0.3, // GSAP catch-up time behind native scroll

    // Fog widens as the camera rises so the map isn't swallowed by the
    // stage-1 fog band (far 16.5 hides everything past ~12 units).
    fogNearEnd: 12,
    fogFarEnd: 56,
    fogRevealPower: 4,

    // Stage-1 text streams fade out early in the descent.
    streamFadeStart: 0.34,
    streamFadeEnd: 0.58,
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
    lightIntensity: 0.8,
    lightFalloff: 0.053,  // tighter pool of light with a faster fall into black

    // Independently tuned counter light. It uses the same hard diffuse
    // response and terrain-shadow model as the primary.
    light2X: 7.6,
    light2Y: 7.8,
    light2Z: 1.1,
    light2Color: '#fef2ff',
    light2Intensity: 1.2,
    light2Falloff: 0.065,

    // Height-field ray shadow. These stay as uniforms so future section looks
    // can animate them without replacing or recompiling the material.
    shadowStrength: 0.81,
    shadowBias: 0.09,
  },
}
