// Allowlist for the dev config writer: save scope -> config file (and optionally the exported object within it)
// and the keys Leva may overwrite.
// Scopes match the `scope.key` names posted by components/scene/controls.
export const EDITABLE_CONFIG = {
  camera: {
    file: 'scene/camera.ts',
    object: 'CAMERA_CONFIG',
    keys: [
      'overviewPosition', 'overviewLookAt',
      'mobileOverviewPosition', 'mobileOverviewLookAt',
      'projectsPosition', 'projectsLookAt',
      'artPosition', 'artLookAt',
      'blogPosition', 'blogLookAt',
      'aboutPosition', 'aboutLookAt', 'mobileAboutPosition', 'mobileAboutLookAt',
      'placesPosition', 'placesLookAt', 'placesLocationPosition', 'placesLocationLookAt',
      'mobilePlacesPosition', 'mobilePlacesLookAt', 'mobilePlacesIndexPosition', 'mobilePlacesIndexLookAt',
      'mobilePlacesLocationPosition', 'mobilePlacesLocationLookAt',
      'fov',
    ],
  },
  cameraJourney: {
    file: 'scene/camera.ts',
    object: 'CAMERA_JOURNEY_CONFIG',
    keys: ['default', 'art', 'aboutEntry', 'aboutFocus', 'placesEntry', 'placesFocus', 'placesIndex'],
  },
  // Three groups in one file share key names (relief, landTint); `object` keeps each scope's writes to its own.
  places: {
    file: 'scene/places.ts',
    object: 'PLACES_CONFIG',
    keys: ['baseColor', 'rimColor', 'rimIntensity', 'lineColor', 'graticuleIntensity', 'coastIntensity',
      'lightDensity', 'lightSize', 'lightIntensity', 'starSize', 'trailColor',
      'landscapeKm', 'linesIn'],
  },
  placesOverview: {
    file: 'scene/places.ts',
    object: 'PLACES_OVERVIEW_CONFIG',
    keys: ['relief', 'landTint', 'trailRadius', 'markerSize', 'innerRingTilt', 'outerRingTilt',
      'friction', 'snapBelow', 'capture', 'snapRate', 'idleDrift', 'idleAfter', 'focusWithin',
      'titleWithin'],
  },
  placesLocation: {
    file: 'scene/places.ts',
    object: 'PLACES_LOCATION_CONFIG',
    keys: ['markerOffset', 'phoneMarkerOffset', 'holdRate', 'turnFrom', 'turnSettle', 'revealAt',
      'summaryBlur', 'relief', 'shade', 'landTint', 'trailRadius',
      'markerSize', 'lensFill', 'lensMaxZoom', 'lensMinZoom', 'lensMargin', 'lensRelief'],
  },
  aboutPath: {
    file: 'scene/aboutPath.ts',
    keys: ['waypoints', 'medic', 'nus', 'greyhats', 'sonicboom', 'uniplans', 'next', 'focusScreen', 'focusFollow',
      'focusZoom', 'phoneFocusScreen', 'phoneFocusFollow', 'phoneFocusZoom', 'trailColor', 'lift'],
  },
  artCursor: {
    file: 'art/cursor.ts',
    keys: ['touchRadius', 'healSeconds', 'smudgeDrag', 'smudgeHealSeconds', 'pencilStrength', 'dotsStrength'],
  },
  backdrop: {
    file: 'art/backdrop.ts',
    keys: ['revealSeconds', 'fogReleaseSeconds'],
  },
  contours: {
    file: 'scene/contours.ts',
    keys: [
      'levels', 'smoothIterations', 'chaikinIterations', 'resampleSpacing',
      'spacingJitter', 'shadowChance', 'shadowOffset', 'shadowIntensity',
      'lift', 'depthBias', 'majorEvery', 'majorMinHeight', 'minorRadius',
      'majorRadius', 'minorColor', 'minorIntensity', 'minorBase', 'majorColor',
      'majorIntensity', 'pulseColor', 'pulseTint', 'pulseSpeed', 'pulseScale',
      'pulseSharpness',
    ],
  },
  intro: {
    file: 'scene/intro.ts',
    keys: ['lineSpacing', 'mapRelief', 'mapSeconds', 'mapHold', 'revealSeconds', 'fadeSeconds'],
  },
  lake: {
    file: 'scene/lake.ts',
    object: 'LAKE_DIVE_CONFIG',
    keys: ['pingCooldown', 'pingSpeed', 'pingDecay', 'pingRange', 'ambient', 'ambientReach', 'rockScale',
      'rockBump', 'rockRelief', 'rockOcclusion', 'speed', 'basinSpeed', 'turnRate', 'pitchRate', 'foundRange',
      'hullHit', 'hullScrape', 'soundVolume'],
  },
  fog: {
    file: 'scene/fog.ts',
    keys: ['near', 'far', 'flightNear', 'flightFar'],
  },
  postProcessing: {
    file: 'scene/postProcessing.ts',
    keys: ['bloomIntensity', 'bloomThreshold', 'bloomSmoothing'],
  },
  terrain: {
    file: 'scene/terrain.ts',
    keys: [
      'elevation', 'seaLevel', 'baseColor', 'ridgeColor', 'shadowStrength',
      'shadowBias', 'lightColor', 'lightX', 'lightY', 'lightZ', 'lightIntensity',
      'lightFalloff', 'light2Color', 'light2X', 'light2Y', 'light2Z',
      'light2Intensity', 'light2Falloff', 'edgeFade',
    ],
  },
  sceneLinks: {
    file: 'scene/sceneLinks.ts',
    keys: ['mobileStartX', 'mobileEndX', 'mobileCenterY', 'mobileDepthOffset'],
  },
  glyphRain: {
    file: 'scene/glyphRain.ts',
    keys: [
      'fallRowsPerSecond',
      'packetRowsPerSecond',
      'letterSwapsPerSecond',
    ],
  },
} as const;

export type ConfigScope = keyof typeof EDITABLE_CONFIG;

export function isConfigScope(value: string): value is ConfigScope {
  return value in EDITABLE_CONFIG;
}
