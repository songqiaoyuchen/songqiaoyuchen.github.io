// The homepage intro's descent (CameraRig, TerrainMesh, SceneFog, Contours): the scene opens straight above the
// summit as a contour map under the preloader's mark, the reveal's wave draws the map outward, and the camera
// lowers to the overview while the ground's light comes on. Leva's Intro folder; the wave itself is tuned in
// Contour Lines › Reveal (CONTOUR_CONFIG.reveal*).
export const INTRO_CONFIG = {
  mapHeight: 18, // camera height above the summit at the map pose, world units
  phoneMapHeight: 30,
  mapTilt: 2, // degrees off vertical, leaning back along the overview's heading, so the map is the right way up
  descentDelay: 1.2, // seconds into the reveal before the camera sets off
  descentSeconds: 2.4,
  mapFogScale: 3.2, // fog distances at the map pose as a multiple of the overview's, eased back on the way down
  lightsIn: [0.15, 0.8] as readonly [number, number], // the ground's light comes on over this span of the descent
  mapMinPixels: 0.75, // minimum on-screen tube radius at the map pose (drawing-buffer pixels), eased out on the way
} as const;
