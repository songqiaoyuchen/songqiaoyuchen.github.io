export const SCENE_CONFIG = {
  camera: {
    position: [0, 0, 10] as const,
    fov: 45,
  },
  globe: {
    radius: 5,
    // Shifted down on the Y axis so the globe appears in the bottom half of the screen
    position: [0, -5, 0] as const,
    segments: 64,
    color: '#1e3a8a', // A deep blue
  },
  controls: {
    enablePan: false,
    enableZoom: true,
    enableRotate: true,
    minDistance: 6,
    maxDistance: 20,
    // Restrict vertical rotation to keep the camera generally looking down/forward
    minPolarAngle: Math.PI / 4,
    maxPolarAngle: Math.PI / 1.5,
  }
};
