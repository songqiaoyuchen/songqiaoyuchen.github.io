// Leva "Travel" folder (dev only, Travel only), grouped: Look, Zoom-out, Rotation, Trip. Save Config writes every
// key to config/scene/travel.ts (Edit camera is not saved). Rarely tuned values stay config-only.
import {folder, useControls} from 'leva';
import {TRAVEL_CONFIG} from '@/config/scene/travel';
import {TRAVEL_FOLDER} from './sectionScope';

const pair = ([a, b]: readonly [number, number]): [number, number] => [a, b];

export function useTravelControls() {
  return useControls('Travel', {
    // SceneCanvas.tsx: hands the pointer to the orbit camera (for Save Camera) instead of the globe. Not saved.
    editCamera: {value: false, label: 'Edit camera'},
    Look: folder({
      // TravelGlobe.tsx: the shell and its lines.
      baseColor: {value: TRAVEL_CONFIG.baseColor, label: 'Ground'},
      rimColor: {value: TRAVEL_CONFIG.rimColor, label: 'Rim colour'},
      rimIntensity: {value: TRAVEL_CONFIG.rimIntensity, min: 0, max: 1, step: 0.01, label: 'Rim'},
      lineColor: {value: TRAVEL_CONFIG.lineColor, label: 'Line colour'},
      graticuleIntensity: {value: TRAVEL_CONFIG.graticuleIntensity, min: 0, max: 1, step: 0.01, label: 'Graticule'},
      coastIntensity: {value: TRAVEL_CONFIG.coastIntensity, min: 0, max: 1.5, step: 0.01, label: 'Coastlines'},
      // TravelGlobe.tsx: relief from the elevation map and the land tint.
      relief: {value: TRAVEL_CONFIG.relief, min: 0, max: 0.05, step: 0.001, label: 'Relief'},
      landTint: {value: TRAVEL_CONFIG.landTint, min: 0, max: 0.3, step: 0.005, label: 'Land tint'},
      // TravelLights.tsx / TravelStars.tsx / TravelTrails.tsx: the night lights, the sky and the trails.
      lightDensity: {value: TRAVEL_CONFIG.lightDensity, min: 0, max: 1, step: 0.01, label: 'Light density'},
      lightSize: {value: TRAVEL_CONFIG.lightSize, min: 0.5, max: 8, step: 0.1, label: 'Light size (px)'},
      starSize: {value: TRAVEL_CONFIG.starSize, min: 0.5, max: 8, step: 0.1, label: 'Star size (px)'},
      trailColor: {value: TRAVEL_CONFIG.trailColor, label: 'Trail colour'},
      trailRadius: {value: TRAVEL_CONFIG.trailRadius, min: 0.001, max: 0.02, step: 0.0005, label: 'Trail radius'},
    }, {collapsed: false}),
    'Zoom-out': folder({
      // TravelGlobe.tsx -> terrain.vert: the entry zoom-out.
      landscapeKm: {value: TRAVEL_CONFIG.landscapeKm, min: 5, max: 200, step: 1, label: 'Landscape (km)'},
      linesIn: {value: pair(TRAVEL_CONFIG.linesIn), min: 0, max: 1, step: 0.01, joystick: false, label: 'Lines in'},
      journeySeconds: {value: TRAVEL_CONFIG.journeySeconds, min: 0.2, max: 8, step: 0.1, label: 'Journey (s)'},
    }, {collapsed: false}),
    Rotation: folder({
      // TravelGlobe.tsx -> lib/scene/travel.ts: rotation feel.
      friction: {value: TRAVEL_CONFIG.friction, min: 0.5, max: 8, step: 0.1, label: 'Friction'},
      snapBelow: {value: TRAVEL_CONFIG.snapBelow, min: 5, max: 150, step: 5, label: 'Snap below (°/s)'},
      capture: {value: TRAVEL_CONFIG.capture, min: 5, max: 90, step: 5, label: 'Capture (°)'},
      snapRate: {value: TRAVEL_CONFIG.snapRate, min: 1, max: 12, step: 0.5, label: 'Snap rate'},
      idleDrift: {value: TRAVEL_CONFIG.idleDrift, min: 0, max: 10, step: 0.5, label: 'Idle drift (°/s)'},
      idleAfter: {value: TRAVEL_CONFIG.idleAfter, min: 0, max: 15, step: 0.5, label: 'Idle after (s)'},
    }, {collapsed: false}),
    Trip: folder({
      // TravelGlobe.tsx -> CameraRig: a selected trip's composition and journey.
      // Save Camera with a trip open keeps the camera's trip pose and sets this to where the marker then sits
      // (Edit camera holds the globe still so the view can be composed freely).
      markerOffset: {value: pair(TRAVEL_CONFIG.markerOffset), step: 0.01, joystick: false, label: 'Trip offset'},
      focusSeconds: {value: TRAVEL_CONFIG.focusSeconds, min: 0.2, max: 6, step: 0.1, label: 'Focus (s)'},
      // TravelGlobe.tsx: the globe's turn begins at this share of the zoom and settles this long past its end.
      turnFrom: {value: TRAVEL_CONFIG.turnFrom, min: 0, max: 1, step: 0.01, label: 'Turn from'},
      turnSettle: {value: TRAVEL_CONFIG.turnSettle, min: 0, max: 3, step: 0.1, label: 'Turn settle (s)'},
    }, {collapsed: false}),
  }, {collapsed: false, ...TRAVEL_FOLDER});
}
