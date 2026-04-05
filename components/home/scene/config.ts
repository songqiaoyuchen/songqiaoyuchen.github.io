export type SceneMode = 'A' | 'B';

export const SCENE_CONFIG = {
  // Shared globe settings
  globe: {
    radius: 5,
    segments: 64,
    color: '#ffffff',
  },
  modes: {
    A: {
      camera: {
        position: [0, 0, 30] as const,
        fov: 45,
        target: [0, 0, 0] as const,
      },
      globe: {
        position: [0, 0, 0] as const,
      },
      controls: {
        orbitEnabled: true,
        enablePan: true,
        rotateSpeed: 0.5,
        zoomSpeed: 0.05,
        panSpeed: 0.3,
        dampingFactor: 0.02,
        minDistance: 14,
        maxDistance: 30,
        minPolarAngle: Math.PI / 4,
        maxPolarAngle: Math.PI / 1.5,
      }
    },
    B: {
      camera: {
        position: [0, 0, 10] as const, // Fixed cinematic perspective
        fov: 45,
        target: [0, 0, 0] as const, // Looking down slightly towards the horizon
      },
      globe: {
        // Shifted down heavily so only the top arc/horizon is visible
        position: [0, -5, 0] as const, 
      },
      controls: {
        orbitEnabled: false, // We disable built-in OrbitControls camera movement
        enablePan: false,
        enableZoom: false,
        enableRotate: false, 
        rotateSpeed: 0.3,
        zoomSpeed: 0.15,
        panSpeed: 0.3,
        dampingFactor: 0.02,
        minDistance: 6,
        maxDistance: 20,
        minPolarAngle: Math.PI / 4,
        maxPolarAngle: Math.PI / 1.5,
      }
    }
  }
};
