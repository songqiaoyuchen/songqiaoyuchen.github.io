// Allowlist for the dev config writer: save scope -> config file and the keys Leva may overwrite.
// Scopes match the `scope.key` names posted by components/scene/controls.
export const EDITABLE_CONFIG = {
  camera: {
    file: 'scene/camera.ts',
    keys: [
      'overviewPosition', 'overviewLookAt',
      'mobileOverviewPosition', 'mobileOverviewLookAt',
      'projectsPosition', 'projectsLookAt',
      'artPosition', 'artLookAt',
      'blogPosition', 'blogLookAt',
      'aboutPosition', 'aboutLookAt',
      'travelPosition', 'travelLookAt', 'travelTripPosition', 'travelTripLookAt',
      'mobileTravelPosition', 'mobileTravelLookAt',
      'fov', 'artTransitionSeconds',
    ],
  },
  travel: {
    file: 'scene/travel.ts',
    keys: ['baseColor', 'rimColor', 'rimIntensity', 'lineColor', 'graticuleIntensity', 'coastIntensity',
      'relief', 'landTint', 'lightDensity', 'lightSize', 'starSize', 'trailColor', 'trailRadius',
      'landscapeKm', 'linesIn', 'journeySeconds',
      'friction', 'snapBelow', 'capture', 'snapRate', 'idleDrift', 'idleAfter',
      'markerOffset', 'focusSeconds', 'turnFrom', 'turnSettle'],
  },
  aboutPath: {
    file: 'scene/aboutPath.ts',
    keys: ['waypoints', 'medic', 'nus', 'greyhats', 'sonicboom', 'uniplans', 'next', 'focusScreen', 'focusFollow',
      'focusZoom', 'trailColor', 'lift', 'journeySeconds', 'focusSeconds'],
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
