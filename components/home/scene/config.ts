export type SceneMode = 'A' | 'B';

export const GLOBE_CONFIG = {
  radius: 5,
  segments: 64,
  color: '#ffffff',
} as const;

export const SCENE_PRESETS = {
  A: {
    cameraPosition: [0, 0, 30] as const,
    cameraFov: 45,
    cameraTarget: [0, 0, 0] as const,

    globePosition: [0, 0, 0] as const,

    interaction: {
      type: 'orbit' as const,
      enablePan: true,
      rotateSpeed: 0.5,
      zoomSpeed: 0.05,
      panSpeed: 0.3,
      dampingFactor: 0.02,
      minDistance: 14,
      maxDistance: 30,
      minPolarAngle: Math.PI / 4,
      maxPolarAngle: Math.PI / 1.5,
    },
  },
  B: {
    cameraPosition: [0, 0, 10] as const,
    cameraFov: 45,
    cameraTarget: [0, 0, 0] as const,

    globePosition: [0, -5, 0] as const,

    interaction: {
      type: 'horizonDrag' as const,
      rotateSpeed: 0.3,
      dampingFactor: 0.04,
    },
  },
} as const;