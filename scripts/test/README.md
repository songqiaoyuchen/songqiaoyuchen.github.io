# scripts/test

Run with `node scripts/test/<file>`; each exits non-zero on failure.

| File | Checks |
| --- | --- |
| `test-about-path.mjs` | `lib/scene/aboutPath.ts`: route sampling and checkpoints, framing without turning, altitude figures |
| `test-travel-lights.mjs` | `lib/scene/travelWorker.ts`: hash and spiral samples, the bilinear map sampler, summary blur and row flip, light sampling against the former in-component loop |
| `test-travel.mjs` | `lib/scene/travel.ts` and the geo bake: sphere places, snap servo against a real camera, coast and capture, tracks, the zoom-out's planet scale, coastline encoding, Terrarium tile maths, GPX/GeoJSON parsing |
| `test-dev-config.mjs` | `app/api/dev-config/literals.ts`: literal formatting (nested waypoint lists) and key replacement, file-wide or within one exported object |
| `test-backdrop-wipe.mjs` | `lib/art/backdropWipe.ts`: constant wipe speed, rapid selection, reduced motion |
| `test-camera-journey.mjs` | `lib/scene/cameraJourney.ts`: one motion between any two poses, journey kinds |
| `test-camera-transition.mjs` | `lib/scene/cameraTransition.ts`: rotation, arrival, retargeting, reduced motion |
| `test-carousel-layout.mjs` | `lib/art/carouselLayout.ts`: settled poses, wrapping, continuous rotation |
| `test-text-transition.mjs` | `lib/scene/textTransition.ts`: visibility, layout swaps, reduced motion |
