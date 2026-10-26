// Art backdrops: the terrain re-rendered as oil, pencil or digital behind the gallery.
// Authoring camera, images and timings; dev-config writes revealSeconds/fogReleaseSeconds here.
import type {Vector3Tuple} from 'three';

export const BACKDROP_CONFIG = {
  // Fixed camera used to author both paintings. Changing the Art pose requires
  // new images; viewport changes crop this projection without stretching it.
  aspect: 2,
  fov: 38,
  position: [-0.922, 10.343, 7.177] as Vector3Tuple,
  lookAt: [6.542, 8.98, 5.106] as Vector3Tuple,
  projectionDistance: 10,
  // Duration of the elevation-contour wipe between backdrops.
  revealSeconds: 3,
  // A selection of a third backdrop mid-wipe resolves the wipe under way (the short way) within this long, then
  // starts its own (lib/art/backdropWipe.ts).
  catchUpSeconds: 0.5,
  // Fade of the backdrop when leaving Art.
  dissolveSeconds: 0.3,
  // Flight fog fades after the arrival wipe; only Digital shows the difference.
  fogReleaseSeconds: 2,
  // The scene follows a selection only after browsing pauses this long.
  settleSeconds: 0.2,
  // Painted backdrops; bump ?v= after replacing an image (digital is procedural).
  images: {
    oil: '/textures/terrain/oil-illustration.webp?v=6',
    pencil: '/textures/terrain/pencil-illustration.webp?v=9',
  },
} as const;
