export type SceneMode = 'A' | 'B';

export const GLOBE_CONFIG = {
  radius: 5,
  segments: 64,
  color: '#ffffff',
} as const;

export const TRANSITION_CONFIG = {
  wheelSensitivity: 0.001,
  damping: 0.05,
  handoffThreshold: 0.7,
  // When false, the scene stays locked in Phase A (free globe drag) and the
  // wheel no longer advances toward Phase B. Rig/transition code is preserved.
  enabled: false,
} as const;

export const SCENE_PRESETS = {
  A: {
    cameraPosition: [0, 0, 10.67] as const,
    cameraFov: 45,
    cameraTarget: [0, 0, 0] as const,

    globePosition: [0, 0, 0] as const,

    // Renders the (centered) globe offset toward the bottom-right via a camera
    // lens shift, so its top-left arc fills the upper-left of the hero. Values
    // are fractions of the viewport; faded out before the Phase-B handoff.
    lensShift: { right: 0.35, down: 1 } as const,

    interaction: {
      type: 'orbit' as const,
      enablePan: false,
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

    globePosition: [0, 0, 0] as const,

    interaction: {
      type: 'horizonDrag' as const,
      rotateSpeed: 0.3,
      dampingFactor: 0.04,
    },
  },
} as const;