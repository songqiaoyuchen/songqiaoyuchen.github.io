# lib/terrain

The baked terrain pipeline (see `docs/terrain-baking.md`). `scripts/bake/bake-terrain.mjs` produces
compressed artifacts offline; at runtime a worker downloads them and builds contours on demand.

| File | Purpose |
| --- | --- |
| `assets.ts` | Main-thread side: owns the worker, exposes textures and contour buffers as hooks |
| `terrain.worker.ts` | Worker: fetches/decompresses artifacts, rebuilds contours |
| `workerTypes.ts` | Messages between `assets.ts` and the worker |
| `manifest.ts` | Baked manifest types and cached fetch |
| `bake.ts` | Height grid types; baked data to Three.js textures |
| `height.ts` | CPU height sampling matching the shader (places scene text) |
| `shell.ts` | Smoothed "shell" height field |
| `blur.ts` | Box-blur passes over a height grid |
| `lightingBake.ts` | Development-only live relight of the two point lights |
| `isolines.ts` | Contour extraction per level (shared with the bake script) |
| `marchingSquares.ts` | Traces one iso-level into polylines |
| `polyline.ts` | Simplify, smooth and resample polylines |
| `lineTubeBuffers.ts` | Polylines to tube vertex/index buffers |
| `lineTube.ts` | Buffers to a Three.js geometry |
| `contourArtifact.ts` | Pack/unpack contour buffers in the baked artifact |
| `contourOptions.ts` | Contour build options and their cache key |
