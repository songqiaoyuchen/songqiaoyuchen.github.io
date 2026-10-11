// Leva Travel folders (dev only), one per group of config/scene/travel.ts: "Travel" (the globe as both views draw
// it, and the zoom-out) on every Travel view, "Travel Overview" over all trips only, "Travel Trip" with a trip open
// only. Save Config writes each folder to its own group (Edit camera is not saved). Rarely tuned values stay
// config-only.
import {folder, useControls} from 'leva';
import {TRAVEL_CONFIG, TRAVEL_OVERVIEW_CONFIG, TRAVEL_TRIP_CONFIG} from '@/config/scene/travel';
import {TRAVEL_FOLDER, TRAVEL_OVERVIEW_FOLDER, TRAVEL_TRIP_FOLDER} from './sectionScope';

export const TRAVEL_TRIP_FOLDER_NAME = 'Travel Trip';

const pair = ([a, b]: readonly [number, number]): [number, number] => [a, b];

/** TRAVEL_CONFIG: the globe's look in both views and the zoom-out from the landscape. */
function useTravelGlobeControls() {
  return useControls('Travel', {
    // SceneCanvas.tsx: hands the pointer to the orbit camera (for Save Camera) instead of the globe. Not saved.
    editCamera: {value: false, label: 'Edit camera'},
    Globe: folder({
      // TravelGlobe.tsx -> globe.frag: the ground (also the landscape's colour as it recedes) and the rim.
      baseColor: {value: TRAVEL_CONFIG.baseColor, label: 'Ground'},
      rimColor: {value: TRAVEL_CONFIG.rimColor, label: 'Rim colour'},
      rimIntensity: {value: TRAVEL_CONFIG.rimIntensity, min: 0, max: 1, step: 0.01, label: 'Rim'},
      // TravelGlobe.tsx: graticule and coastline colour and opacity (the colour also tints lights, rings, stars).
      lineColor: {value: TRAVEL_CONFIG.lineColor, label: 'Line colour'},
      graticuleIntensity: {value: TRAVEL_CONFIG.graticuleIntensity, min: 0, max: 1, step: 0.01, label: 'Graticule'},
      coastIntensity: {value: TRAVEL_CONFIG.coastIntensity, min: 0, max: 1.5, step: 0.01, label: 'Coastlines'},
      // TravelLights.tsx / TravelStars.tsx / TravelTrails.tsx: the night lights, the sky and the trails.
      lightDensity: {value: TRAVEL_CONFIG.lightDensity, min: 0, max: 1, step: 0.01, label: 'Light density'},
      lightSize: {value: TRAVEL_CONFIG.lightSize, min: 0.5, max: 8, step: 0.1, label: 'Light size (px)'},
      starSize: {value: TRAVEL_CONFIG.starSize, min: 0.5, max: 8, step: 0.1, label: 'Star size (px)'},
      trailColor: {value: TRAVEL_CONFIG.trailColor, label: 'Trail colour'},
      trailRadius: {value: TRAVEL_CONFIG.trailRadius, min: 0.001, max: 0.02, step: 0.0005, label: 'Trail radius'},
    }, {collapsed: false}),
    'Zoom-out': folder({
      // TravelGlobe.tsx -> terrain.vert, CameraRig: the journey between the landscape and either Travel view.
      landscapeKm: {value: TRAVEL_CONFIG.landscapeKm, min: 5, max: 200, step: 1, label: 'Landscape (km)'},
      linesIn: {value: pair(TRAVEL_CONFIG.linesIn), min: 0, max: 1, step: 0.01, joystick: false, label: 'Lines in'},
      journeySeconds: {value: TRAVEL_CONFIG.journeySeconds, min: 0.2, max: 8, step: 0.1, label: 'Journey (s)'},
    }, {collapsed: false}),
  }, {collapsed: false, ...TRAVEL_FOLDER});
}

/** TRAVEL_OVERVIEW_CONFIG: the all-trips globe's ground and its feel by hand. */
function useTravelOverviewControls() {
  return useControls('Travel Overview', {
    Ground: folder({
      // TravelGlobe.tsx -> globe.vert/.frag (and the riding landscape's tint, terrain.frag).
      relief: {value: TRAVEL_OVERVIEW_CONFIG.relief, min: 0, max: 0.05, step: 0.001, label: 'Relief'},
      landTint: {value: TRAVEL_OVERVIEW_CONFIG.landTint, min: 0, max: 0.3, step: 0.005, label: 'Land tint'},
    }, {collapsed: false}),
    Rotation: folder({
      // TravelGlobe.tsx -> lib/scene/travel.ts: coasting, capture and idle drift.
      friction: {value: TRAVEL_OVERVIEW_CONFIG.friction, min: 0.5, max: 8, step: 0.1, label: 'Friction'},
      snapBelow: {value: TRAVEL_OVERVIEW_CONFIG.snapBelow, min: 5, max: 150, step: 5, label: 'Snap below (°/s)'},
      capture: {value: TRAVEL_OVERVIEW_CONFIG.capture, min: 5, max: 90, step: 5, label: 'Capture (°)'},
      snapRate: {value: TRAVEL_OVERVIEW_CONFIG.snapRate, min: 1, max: 12, step: 0.5, label: 'Snap rate'},
      idleDrift: {value: TRAVEL_OVERVIEW_CONFIG.idleDrift, min: 0, max: 10, step: 0.5, label: 'Idle drift (°/s)'},
      idleAfter: {value: TRAVEL_OVERVIEW_CONFIG.idleAfter, min: 0, max: 15, step: 0.5, label: 'Idle after (s)'},
    }, {collapsed: false}),
  }, {collapsed: false, ...TRAVEL_OVERVIEW_FOLDER});
}

/** TRAVEL_TRIP_CONFIG: a selected trip's framing, journey and raised-relief look. */
function useTravelTripControls() {
  return useControls(TRAVEL_TRIP_FOLDER_NAME, {
    Framing: folder({
      // TravelGlobe.tsx: where the trip sits on screen. Save Camera with a trip open keeps the camera's trip pose
      // and sets this to where the marker then sits (Edit camera holds the globe still so the view can be composed
      // freely).
      markerOffset: {value: pair(TRAVEL_TRIP_CONFIG.markerOffset), step: 0.01, joystick: false, label: 'Trip offset'},
      holdRate: {value: TRAVEL_TRIP_CONFIG.holdRate, min: 1, max: 12, step: 0.5, label: 'Hold rate'},
      // CameraRig.tsx / TravelGlobe.tsx: the journey to and from the trip, and the globe's turn along it.
      focusSeconds: {value: TRAVEL_TRIP_CONFIG.focusSeconds, min: 0.2, max: 6, step: 0.1, label: 'Focus (s)'},
      turnFrom: {value: TRAVEL_TRIP_CONFIG.turnFrom, min: 0, max: 1, step: 0.01, label: 'Turn from'},
      turnSettle: {value: TRAVEL_TRIP_CONFIG.turnSettle, min: 0, max: 3, step: 0.1, label: 'Turn settle (s)'},
    }, {collapsed: false}),
    Ground: folder({
      // useElevation.ts -> globe.vert/.frag: the raised-relief map. The blur rebuilds the summary on change.
      summaryBlur: {value: TRAVEL_TRIP_CONFIG.summaryBlur, min: 0, max: 8, step: 1, label: 'Summary blur (texels)'},
      relief: {value: TRAVEL_TRIP_CONFIG.relief, min: 0, max: 0.1, step: 0.001, label: 'Relief'},
      shade: {value: TRAVEL_TRIP_CONFIG.shade, min: 0, max: 4, step: 0.05, label: 'Shade'},
      landTint: {value: TRAVEL_TRIP_CONFIG.landTint, min: 0, max: 0.3, step: 0.005, label: 'Land tint'},
    }, {collapsed: false}),
  }, {collapsed: false, ...TRAVEL_TRIP_FOLDER});
}

/** The three Travel folders, keyed by their save scopes. */
export function useTravelControls() {
  return {
    travel: useTravelGlobeControls(),
    travelOverview: useTravelOverviewControls(),
    travelTrip: useTravelTripControls(),
  };
}
