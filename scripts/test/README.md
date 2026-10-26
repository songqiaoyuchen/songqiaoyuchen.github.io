# scripts/test

Run with `node scripts/test/<file>`; each exits non-zero on failure.

| File | Checks |
| --- | --- |
| `test-about-path.mjs` | `lib/scene/aboutPath.ts`: route sampling and checkpoints, framing without turning, altitude figures |
| `test-places-lights.mjs` | `lib/scene/placesWorker.ts`: hash and spiral samples, the bilinear map sampler, summary blur and row flip, light sampling against the former in-component loop |
| `test-places.mjs` | `lib/scene/places.ts` and the geo bake: sphere places, snap servo against a real camera, coast and capture, tracks, the zoom-out's planet scale and ride wrap, coastline encoding, Terrarium tile maths, GPX/GeoJSON parsing |
| `test-dev-config.mjs` | `app/api/dev-config/literals.ts`: literal formatting (nested waypoint lists) and key replacement, file-wide or within one exported object |
| `test-backdrop-wipe.mjs` | `lib/art/backdropWipe.ts`: constant wipe speed, rapid selection, reduced motion |
| `test-camera-journey.mjs` | `lib/scene/cameraJourney.ts`: one motion between any two poses, journey kinds |
| `test-map-field.mjs` | `lib/intro/mapField.ts` and `lib/intro/markPaths.ts`: the mark's rings parse closed and nested, the field is the mark's distance, the isolines close around it |
| `test-camera-transition.mjs` | `lib/scene/cameraTransition.ts`: rotation, arrival, retargeting, reduced motion |
| `test-carousel-layout.mjs` | `lib/art/carouselLayout.ts`: settled poses, wrapping, continuous rotation |
| `test-photo-track.mjs` | `lib/places/photoTrack.ts`: settled row, gaps, no overlap while moving, overscroll |
| `test-text-transition.mjs` | `lib/scene/textTransition.ts`: visibility, layout swaps, reduced motion |
| `test-reach.mjs` | `lib/terrain/reach.ts`: the summit as origin, plain distances near Euclidean, a ridge in the way counted as a climb |
| `test-lake.mjs` | `lib/scene/lake.ts`: a level route of the asked length, walls closed at the ends and open between, points about the route and the wall readout, inward normals, the bottle in the chamber, an idle craft kept inside, a craft steered along the route reaching the bottle |
