# Performance

Findings from the 2026-10-12 profile of section transitions and sub-page navigation. Evidence, not a
prescribed sequence; recheck numbers after each change. Method: headless Chrome over CDP against the
production build (`next start`) and the dev server, 1920×1080 at device pixel ratio 1.25 (canvas 2400×1350),
AMD integrated GPU. Per-frame JavaScript, long animation frames, sampled CPU profiles, React commit self
time (dev) and GPU timer queries per render pass.

## What the measurements say

The main thread is nearly idle during camera journeys (about 2 ms of requestAnimationFrame work per
frame), yet Home runs at 18 fps. The frame is GPU-bound. Steady state, production, per frame:

| Route | fps | GPU ms/frame | Where it goes |
| --- | --- | --- | --- |
| Home, Blog, Projects | 17–20 | 42–48 | glyph rain 16 (10 full-size passes + 3 half-size), SMAA 15 (weights alone 10), scene 6.6 (drawn twice), bloom chain 7, final blend 2.3 |
| About | 22 | 35 | scene 8.3, SMAA 15, bloom 8 |
| Places overview / location | 30 / 58 | 24 / 13 | SMAA 11 / 5, scene 5 / 3.5 |
| Art (still) | 60 | 0 | `StillFrameGate` works |

A/B in the same page: pixel ratio 1 halved the GPU time on Home (48 → 20 ms, 42 fps); removing every
`backdrop-filter` raised Home from 18 to 27 fps and Blog from 17 to 37 fps (the compositor's blur competes
for the same GPU). Timings swing up to 2× between runs; treat them as ranking, not targets.

On top of the steady cost, single-frame stalls land during transitions:

| Stall | Where | Cause |
| --- | --- | --- |
| 250–330 ms, mid-journey into Places | `getProgramInfoLog`/`getShaderInfoLog` | globe materials link synchronously on their first visible frame; `SceneReadySignal` only `compileAsync`es what is mounted at intro |
| 250 ms (prod), 1.2–1.8 s (dev), 2.5 s after the intro | `PlacesGlobe` mount (`PLACES_PREFETCH_MS`) | `PlacesLights` samples 140k points, `useElevation` reads a 2048×1024 `getImageData`, 256×128 sphere, all inside render-phase `useMemo`; lands on the first drawer open |
| 3.9 s blank, then 14 fps for 2 s | Back from `/projects/all` (same for `/blog/all`, `/blog/[slug]`) | these routes sit outside `(scene)`: `SceneShell` unmounts, the GL context is lost, the preloader replays, every shader recompiles and every texture re-uploads |
| 180–450 ms React commit, with forced layout | Projects drawer, `/projects/all` | `PixelCard` builds ~10k `Pixel` objects per card and reads colours back through `getImageData`, twice (mount plus the ResizeObserver's first callback) |
| 2 × 100–150 ms `IMG.onload` + 184 ms `texSubImage2D` | Art arrival | both backdrop paintings decode and upload on the main thread while the camera flies |
| 100–440 ms per transition (dev only) | Leva | the hidden panel re-renders every control (`Styled.div`, `RangeSlider`, `Label`) on each section change |

## Implemented 2026-10-12 (no change to resolution or the post chain)

Opaque canvas (`alpha: false`); `StillFrameGate` on every route (its signature now refreshes world matrices and
covers lines and points, or a turning ring read as still); glyph rain stepping at 30 Hz
(`GLYPH_RAIN_CONFIG.compositor.stepsPerSecond`); `PrecompileHidden` links the globe's and About map's programs at
idle against the composer's buffer; backdrops decoded as ImageBitmaps and uploaded at idle; the globe's map
decode, summary and light sampling in `lib/scene/places.worker.ts`; About map built at idle; the composer's
children, the scene layers and the shell callbacks memoized; the Art context split; drawer chunks prefetched at
idle; hidden Places layers, callouts, the sphere raycast, SceneLinks, MeridianStrip, the location sheet, PixelCard and
the scroll handlers gated or de-allocated. Same machine, same method, quiet GPU:

| Transition | fps before → after | frames over 50 ms | worst main-thread frame |
| --- | --- | --- | --- |
| Home → Blog / Projects drawer | 42 / 41 → 48 / 52 | 7 / 5 → 7 / 3 | 11 → 13 ms |
| Drawer → Home | 26 / 43 → 33 / 59 | 16 / 3 → 8 / 1 | |
| Home → About / About → Home | 49 / 56 → 54 / 59 | 4 / 1 → 3 / 1 | 27 → 22 ms |
| Home → Places | 41 → 58 | 8 → 1 | 327 → 26 ms (shader link gone) |
| Home → Art / All works → Home | 46 / 45 → 52 / 39 | 9 / 7 → 3 / 15 | |
| Places overview at rest | 30 fps, 24 ms GPU → draws only while the rings turn | | |

Steady-state GPU on Home is unchanged in substance (43–48 ms at 2400×1350: glyph rain, SMAA, bloom) because the
rain only halves its passes once frames are faster than 33 ms. Another application on the GPU (Firefox during one
run) quartered every number; check the GPU Engine utilization counter (PowerShell `Get-Counter`) before trusting
a run. Still open from the lists below: the archive routes' scene teardown (a route decision), the GPU budget
items, the drawer content's `filter: blur` entrance (a 150–340 ms paint on the first frame of every drawer open)
and the gallery transition's layout reads on All works entry.

## Level 1: JavaScript and render work

Ranked by expected effect on dropped frames.

- [ ] **Keep the scene alive across the archive routes.** Move `app/blog/all`, `app/projects/all` and
  `app/blog/[slug]` into `(scene)` as routed content over a paused canvas (as `/artworks/all` already is), or
  keep the renderer and terrain pipeline warm and skip the preloader on a warm return.
  `components/shell/SceneShell.tsx`, `components/scene/SceneCanvas.tsx:193` (disposal scheduling).
- [x] **Precompile Places's materials.** After the quiet globe mount, run `gl.compileAsync` on the globe
  group (or render it once at 1×1) so the entry journey never links shaders. `components/scene/SceneReadySignal.tsx:27`,
  `components/scene/places/PlacesGlobe.tsx`.
- [x] **Move the globe's build off the render phase.** Bake the land light points to a binary (deterministic from
  `elevation.png` and density), or sample them and decode the elevation in a worker with `createImageBitmap`;
  stage the rest across idle callbacks. `components/scene/places/PlacesLights.tsx:54-98`, `components/scene/places/useElevation.ts`.
- [x] **Stop the composer rebuild on every canvas render.** `<EffectComposer>` children are new JSX each render,
  so `@react-three/postprocessing` rebuilds the pass (and leaks the old one). Memoize the composer subtree,
  `React.memo` the heavy layers (`PlacesGlobe`, `CachedTerrain`, `Contours`, `SceneLinks`), keep
  `toggleSection`/`closeSection` stable (they change with `drawerRoute`), and split `ArtSceneContext` so a
  backdrop change does not re-render the canvas. `SceneCanvas.tsx:372-386`, `SceneShell.tsx:169-193`,
  `components/art/ArtSceneContext.tsx:22`.
- [x] **Gate work by visibility.** `PlacesCallouts` writes ~200 styles and attributes per frame from the start of
  the entry zoom while its layer is at opacity 0 (`components/scene/places/PlacesCallouts.tsx:182-312`);
  `PlacesLights`, `PlacesTrails`, `PlacesRings`, `PlacesStars` keep their `useFrame` work with the globe hidden;
  the hidden globe's 65k-triangle sphere still answers every pointer move on Home (`PlacesGlobe.tsx:345, 788-797`;
  give it an analytic sphere `raycast`); `SceneLinks` writes five `disabled` flags and remeasures hit targets every
  frame (`components/scene/text/SceneLinks.tsx:239-259`); `MeridianStrip` redraws its canvas every frame under
  idle drift (`components/places/MeridianStrip.tsx:68-142`); `useLocationSheetPlacement` rewrites a 36-point
  `shape-outside` and calls `getComputedStyle` twice per frame (`components/places/useLocationSheetPlacement.ts:85-121`).
  Early-out, write only on change, and quantize.
- [x] **PixelCard.** Build pixels on first hover/focus, ignore the ResizeObserver's first callback, skip the
  mount-time disappear pass, and resolve colours once per variant instead of through canvas readback.
  `components/projects/PixelCard.tsx:91-137, 187-190`, `components/projects/pixelCardPixels.ts:99`.
- [x] **Art arrival uploads.** Decode the backdrops with `ImageBitmapLoader` and upload one per idle frame after
  arrival. `components/scene/backdrop/useBackdropImage.ts:17-25`.
- [x] **Allocation hygiene in `lib/scene/places.ts` and `PlacesGlobe`'s frame** (15–25 short-lived objects per
  frame; `aimForOffset`, `globeQuaternion`, `anglesToward`, `projectGlobe`): add scratch objects and `out`
  parameters. Low urgency; not visible in the profiles.
- [ ] **Development only:** render Leva's controls lazily (`SceneShell.tsx:16`, `components/shell/DevPanels.tsx`),
  and have the `useControls` hooks return config constants in production so leva (67 KB gzip) leaves the
  first-load bundle of every scene route.

## Level 2: GPU budget and static delivery

GPU, in order of ms per frame on Home:

- [ ] **Glyph rain (16 ms).** Render the three rear layers (blurred anyway) at half size, or the whole compositor at
  half size, and skip the compositor on frames where the rain has not advanced (step it at 30 Hz).
  `lib/text/glyphRainCompositor.ts:228-262`, `config/scene/glyphRain.ts`.
- [ ] **SMAA (15 ms at 2400×1350).** Run the composer at pixel ratio 1 when the device ratio is above 1 (SMAA then
  covers the upscale), or replace SMAA with FXAA on integrated GPUs; `SMAAPreset.LOW` is a cheaper middle.
  `components/scene/effects/ColorOnlySMAA.tsx`, `SceneCanvas.tsx:372`.
- [ ] **Adaptive pixel ratio.** Clamp `dpr` to 1 while a journey runs and restore it on arrival (drei
  `PerformanceMonitor`/`AdaptiveDpr` pattern, or `setDpr` from `CameraRig`'s transitioning flag). Halves GPU time
  exactly when frames matter most.
- [ ] **Drop `backdrop-filter` over the live canvas.** The nav blur (`components/site/Nav.css:31`), the Blog
  panel's bottom reveal (`components/home/drawer/Drawer.css:86`), `MediumNav.css:19` and the Inspection
  backdrop (`Inspection.css:22`) sit on 60–97% opaque tints; use the tint alone, or enable the blur only while the
  canvas is still. The drawer content's `filter: blur(10px)` entrance (`styles/keyframes.css:5`) also runs
  during the journey; fade and translate instead.
- [ ] **Scene drawn twice.** Check why the main scene renders ~1.8× per frame (the bloom selection pass or the
  terrain cache); render the bloom selection from a layer mask instead of a second scene pass if that is it.

Static delivery (GitHub Pages, every public asset is served with a 10-minute cache):

- [ ] **Artwork images (6–8 MB per Art visit).** `images.unoptimized` disables `srcset`, so every `sizes` prop is
  ignored and the originals (up to 4265×3129, 2.2 MB) ship to 480 px cards. Add a build-time sharp step writing
  AVIF/WebP at 640/1080/1600/2400 with hashed names and a custom `images.loader` so the existing `sizes` work.
- [ ] **Terrain first load (6.3 MB gzip, fetched one file after another).** `shell` duplicates `displacement` at
  f32 (u16 row-delta: 3.1 → 1.0 MB); `static-lighting` fits rg8 with sqrt encoding (2.2 → 0.9 MB); contour
  indices are u32 for 60k vertices. Fetch the four artifacts in parallel in `lib/terrain/terrain.worker.ts:63-102`.
  About 6.3 → 2.4 MB.
- [ ] **About map contours (1.1–1.6 s in the worker on desktop, first About open).** Deterministic from baked
  inputs: bake them as a second contour artifact, or prewarm in the worker at idle after Home is ready and
  persist in IndexedDB keyed by contour key and source hash.
- [ ] **Font (1.36 MB TTF preloaded on every page).** Subset Krypton to Latin, instance the used weights, ship WOFF2
  (~20–40 KB). `app/layout.tsx:7-11`. WebGL text uses a baked atlas, not this file.
- [ ] **Startup waterfall.** Start `loadTerrainAssets()` from `SceneShell` alongside the lazy canvas import, and
  emit preload links for the hashed artifacts from the layout; the worker shares the HTTP cache.
- [ ] **Unhashed public assets** (`places/elevation.png`, `region.png`, `coast.bin`, artworks, text atlas) revalidate
  every 10 minutes; hash them in `scripts/assets/build-places-geo.mjs` and the image step, or add a small
  cache-first service worker for `/textures`, `/places`, `/images`.
- [ ] **Bundle:** `/places` first load pulls three.js through `MeridianStrip` → `lib/scene/places.ts` (move
  `angularDistance` to a three-free module); 139 MB of bake sources (`diffuse_map.png`, `heightmap.exr`,
  `gradient.*.bin.gz`) are deployed but never fetched; `og.png` is 1.8 MB.

## Level 3: workers and the GPU

Web workers cannot drive the WebGL context that R3F owns, and the GPU is a single queue, so "parallel workers"
do not add GPU throughput. What they can do is keep the main thread free so the frame the GPU is already busy
with is not also waiting on JavaScript:

- [ ] **Terrain worker as the home for every deterministic build:** About contours (above), Places light points,
  elevation decode (`createImageBitmap` + `OffscreenCanvas` in the worker), coastline tube buffers. Transfer
  typed arrays; build `BufferGeometry` on the main thread from them (cheap).
- [ ] **Image decode off the main thread:** `ImageBitmapLoader` for backdrops and the Places region tile;
  `decoding="async"` is already the default for `<img>`, so artworks only need the size pipeline above.
- [x] **Shader compilation in parallel:** `KHR_parallel_shader_compile` is what `compileAsync` uses; extend it to
  every material mounted after the intro (globe, About path, backdrops) so links never block a frame.
- [ ] **OffscreenCanvas rendering in a worker** would move R3F's whole loop off the main thread and is the only
  way to make React commits and layout stop stealing frames from the renderer. It is a large change (R3F
  supports it via `@react-three/offscreen`, drei `Html` layers and pointer events need bridging) and the GPU
  budget above is the bigger lever; revisit only if Levels 1–2 leave main-thread stalls.
