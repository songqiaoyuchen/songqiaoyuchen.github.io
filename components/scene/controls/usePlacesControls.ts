// Leva Places folders (dev only), one per group of config/scene/places.ts: "Places" (the globe as both views draw it,
// and the zoom-out) on every Places view, "Places Overview" over all locations only, "Places Location" with a location
// open only. Save Config writes each folder to its own group (Edit camera is not saved). Rarely tuned values stay
// config-only.
import {folder, useControls} from 'leva';
import {PLACES_CONFIG, PLACES_OVERVIEW_CONFIG, PLACES_LOCATION_CONFIG} from '@/config/scene/places';
import {PLACES_FOLDER, PLACES_OVERVIEW_FOLDER, PLACES_LOCATION_FOLDER} from './sectionScope';

export const PLACES_LOCATION_FOLDER_NAME = 'Places Location';

const pair = ([a, b]: readonly [number, number]): [number, number] => [a, b];

/** PLACES_CONFIG: the globe's look in both views and the zoom-out from the landscape. */
function usePlacesGlobeControls() {
  return useControls('Places', {
    // SceneCanvas.tsx: hands the pointer to the orbit camera (for Save Camera) instead of the globe. Not saved.
    editCamera: {value: false, label: 'Edit camera'},
    Globe: folder({
      // PlacesGlobe.tsx -> globe.frag: the ground (also the landscape's colour as it recedes) and the rim.
      baseColor: {value: PLACES_CONFIG.baseColor, label: 'Ground'},
      rimColor: {value: PLACES_CONFIG.rimColor, label: 'Rim colour'},
      rimIntensity: {value: PLACES_CONFIG.rimIntensity, min: 0, max: 1, step: 0.01, label: 'Rim'},
      // PlacesGlobe.tsx: graticule and coastline colour and opacity (the colour also tints lights, rings, stars).
      lineColor: {value: PLACES_CONFIG.lineColor, label: 'Line colour'},
      graticuleIntensity: {value: PLACES_CONFIG.graticuleIntensity, min: 0, max: 1, step: 0.01, label: 'Graticule'},
      coastIntensity: {value: PLACES_CONFIG.coastIntensity, min: 0, max: 1.5, step: 0.01, label: 'Coastlines'},
      // PlacesLights.tsx / PlacesStars.tsx / PlacesTrails.tsx: the night lights, the sky and the trails.
      lightDensity: {value: PLACES_CONFIG.lightDensity, min: 0, max: 1, step: 0.01, label: 'Light density'},
      lightSize: {value: PLACES_CONFIG.lightSize, min: 0.5, max: 8, step: 0.1, label: 'Light size (px)'},
      lightIntensity: {
        value: PLACES_CONFIG.lightIntensity, min: 0, max: 2, step: 0.01, label: 'Light intensity',
      },
      starSize: {value: PLACES_CONFIG.starSize, min: 0.5, max: 8, step: 0.1, label: 'Star size (px)'},
      trailColor: {value: PLACES_CONFIG.trailColor, label: 'Trail colour'},
    }, {collapsed: false}),
    'Zoom-out': folder({
      // PlacesGlobe.tsx -> terrain.vert, CameraRig: the journey between the landscape and either Places view.
      landscapeKm: {value: PLACES_CONFIG.landscapeKm, min: 5, max: 200, step: 1, label: 'Landscape (km)'},
      linesIn: {value: pair(PLACES_CONFIG.linesIn), min: 0, max: 1, step: 0.01, joystick: false, label: 'Lines in'},
    }, {collapsed: false}),
  }, {collapsed: false, ...PLACES_FOLDER});
}

/** PLACES_OVERVIEW_CONFIG: the all-locations globe's ground and its feel by hand. */
function usePlacesOverviewControls() {
  return useControls('Places Overview', {
    Ground: folder({
      // PlacesGlobe.tsx -> globe.vert/.frag (and the riding landscape's tint, terrain.frag).
      relief: {value: PLACES_OVERVIEW_CONFIG.relief, min: 0, max: 0.05, step: 0.001, label: 'Relief'},
      landTint: {value: PLACES_OVERVIEW_CONFIG.landTint, min: 0, max: 0.3, step: 0.005, label: 'Land tint'},
      // PlacesTrails.tsx: the trail's thickness here; it eases to the location's over the focus journey.
      trailRadius: {
        value: PLACES_OVERVIEW_CONFIG.trailRadius, min: 0.0005, max: 0.02, step: 0.0001, label: 'Trail radius',
      },
      // PlacesCallouts.tsx: the locations' markers, CSS pixels.
      markerSize: {value: PLACES_OVERVIEW_CONFIG.markerSize, min: 6, max: 48, step: 1, label: 'Marker size (px)'},
      // PlacesCallouts.tsx: locations nearer than this share one marker, which fans out on a click.
      clusterWithin: {
        value: PLACES_OVERVIEW_CONFIG.clusterWithin, min: 0, max: 10, step: 0.1, label: 'Cluster within (°)',
      },
      phoneClusterWithin: {
        value: PLACES_OVERVIEW_CONFIG.phoneClusterWithin, min: 0, max: 20, step: 0.1, label: 'Phone cluster (°)',
      },
    }, {collapsed: false}),
    Rings: folder({
      // PlacesRings.tsx: each ring's axis, tilted about x and z in degrees; drag the joystick to turn it.
      innerRingTilt: {value: pair(PLACES_OVERVIEW_CONFIG.innerRingTilt), step: 1,
        label: 'Inner tilt (x, z)'},
      outerRingTilt: {value: pair(PLACES_OVERVIEW_CONFIG.outerRingTilt), step: 1,
        label: 'Outer tilt (x, z)'},
    }, {collapsed: false}),
    Rotation: folder({
      // PlacesGlobe.tsx -> lib/scene/places.ts: coasting, capture and idle drift.
      friction: {value: PLACES_OVERVIEW_CONFIG.friction, min: 0.5, max: 8, step: 0.1, label: 'Friction'},
      snapBelow: {value: PLACES_OVERVIEW_CONFIG.snapBelow, min: 5, max: 150, step: 5, label: 'Snap below (°/s)'},
      capture: {value: PLACES_OVERVIEW_CONFIG.capture, min: 5, max: 90, step: 5, label: 'Capture (°)'},
      snapRate: {value: PLACES_OVERVIEW_CONFIG.snapRate, min: 1, max: 12, step: 0.5, label: 'Snap rate'},
      idleDrift: {value: PLACES_OVERVIEW_CONFIG.idleDrift, min: 0, max: 10, step: 0.5, label: 'Idle drift (°/s)'},
      idleAfter: {value: PLACES_OVERVIEW_CONFIG.idleAfter, min: 0, max: 15, step: 0.5, label: 'Idle after (s)'},
      // PlacesGlobe.tsx: how near the globe's centre a location shows its open cue, apart from the capture.
      focusWithin: {value: PLACES_OVERVIEW_CONFIG.focusWithin, min: 5, max: 60, step: 1, label: 'Focus within (°)'},
    }, {collapsed: false}),
  }, {collapsed: false, ...PLACES_OVERVIEW_FOLDER});
}

/** PLACES_LOCATION_CONFIG: a selected location's framing, journey and raised-relief look. */
function usePlacesLocationControls() {
  return useControls(PLACES_LOCATION_FOLDER_NAME, {
    Framing: folder({
      // PlacesGlobe.tsx: where the location sits on screen. Save Camera with a location open keeps the camera's
      // location pose and sets this to where the marker then sits (Edit camera holds the globe still so the view can be
      // composed freely). Phones have their own.
      markerOffset: {
        value: pair(PLACES_LOCATION_CONFIG.markerOffset), step: 0.01, joystick: false, label: 'Location offset',
      },
      phoneMarkerOffset: {
        value: pair(PLACES_LOCATION_CONFIG.phoneMarkerOffset), step: 0.01, joystick: false,
        label: 'Phone location offset',
      },
      holdRate: {value: PLACES_LOCATION_CONFIG.holdRate, min: 1, max: 12, step: 0.5, label: 'Hold rate'},
      // PlacesGlobe.tsx: the globe's turn along the journey to and from the location (Camera Journeys › Places focus).
      turnFrom: {value: PLACES_LOCATION_CONFIG.turnFrom, min: 0, max: 1, step: 0.01, label: 'Turn from'},
      turnSettle: {value: PLACES_LOCATION_CONFIG.turnSettle, min: 0, max: 3, step: 0.1, label: 'Turn settle (s)'},
      // PlacesGlobe.tsx: back to all locations, the rings, other markers and titles wait for this share of the turn.
      revealAt: {value: PLACES_LOCATION_CONFIG.revealAt, min: 0, max: 1, step: 0.05, label: 'Reveal at'},
    }, {collapsed: false}),
    Ground: folder({
      // useElevation.ts -> globe.vert/.frag: the raised-relief map. The blur rebuilds the summary on change.
      summaryBlur: {value: PLACES_LOCATION_CONFIG.summaryBlur, min: 0, max: 8, step: 1, label: 'Summary blur (texels)'},
      relief: {value: PLACES_LOCATION_CONFIG.relief, min: 0, max: 0.1, step: 0.001, label: 'Relief'},
      shade: {value: PLACES_LOCATION_CONFIG.shade, min: 0, max: 4, step: 0.05, label: 'Shade'},
      landTint: {value: PLACES_LOCATION_CONFIG.landTint, min: 0, max: 0.3, step: 0.005, label: 'Land tint'},
      trailRadius: {
        value: PLACES_LOCATION_CONFIG.trailRadius, min: 0.0005, max: 0.02, step: 0.0001, label: 'Trail radius',
      },
      markerSize: {value: PLACES_LOCATION_CONFIG.markerSize, min: 6, max: 48, step: 1, label: 'Marker size (px)'},
    }, {collapsed: false}),
    Zoom: folder({
      // PlacesGlobe.tsx -> placesLens.glsl: a small location magnified by a conformal zoom of the surface as it opens.
      lensFill: {value: PLACES_LOCATION_CONFIG.lensFill, min: 2, max: 30, step: 0.5, label: 'Fill (°)'},
      lensMaxZoom: {value: PLACES_LOCATION_CONFIG.lensMaxZoom, min: 1, max: 8, step: 0.1, label: 'Max zoom'},
      lensMinZoom: {value: PLACES_LOCATION_CONFIG.lensMinZoom, min: 1, max: 3, step: 0.05, label: 'Min zoom'},
      lensMargin: {value: PLACES_LOCATION_CONFIG.lensMargin, min: 0, max: 1, step: 0.05, label: 'Margin'},
      lensRelief: {value: PLACES_LOCATION_CONFIG.lensRelief, min: 0, max: 1, step: 0.05, label: 'Relief gain (power)'},
    }, {collapsed: true}),
  }, {collapsed: false, ...PLACES_LOCATION_FOLDER});
}

/** The three Places folders, keyed by their save scopes. */
export function usePlacesControls() {
  return {
    places: usePlacesGlobeControls(),
    placesOverview: usePlacesOverviewControls(),
    placesLocation: usePlacesLocationControls(),
  };
}
