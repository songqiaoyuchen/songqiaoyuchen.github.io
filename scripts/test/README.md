# scripts/test

Run with `node scripts/test/<file>`; each exits non-zero on failure.

| File | Checks |
| --- | --- |
| `test-backdrop-wipe.mjs` | `lib/art/backdropWipe.ts`: constant wipe speed, rapid selection, reduced motion |
| `test-camera-transition.mjs` | `lib/scene/cameraTransition.ts`: rotation, arrival, retargeting, reduced motion |
| `test-carousel-layout.mjs` | `lib/art/carouselLayout.ts`: settled poses, wrapping, continuous rotation |
| `test-text-transition.mjs` | `lib/scene/textTransition.ts`: visibility, layout swaps, reduced motion |
