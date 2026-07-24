# Terrain pre-baking guide

Status: implementation guide. The artifact format remains an experiment until
the baked and live paths have been compared visually.

## Objective

Move deterministic terrain work out of the browser without reducing terrain
detail. The production page should download ready-to-upload textures and CPU
grids instead of decoding the 33 MB EXR and rebuilding them on every cold load.

The current browser pipeline is:

1. Decode `public/textures/terrain/heightmap.exr`.
2. Convert its first channel from half-float and sRGB.
3. Blur and downsample a displacement grid.
4. Calculate the two-channel height gradient at full source resolution.
5. Smooth the CPU shell grid and extract contour geometry.

Steps 1-4 are deterministic for the checked-in heightmap and scene config, so
they are the safest first bake. Keep decor-stream geometry live for now.

## First implementation: exact artifacts

Add a development-only `scripts/bake-terrain.mjs` and an `npm run bake:terrain`
command. Refactor the numeric parts of `lib/terrain/bake.ts` into functions that
accept typed arrays and return typed arrays; keep Three.js `DataTexture`
construction in the browser loader.

The script should produce this directory:

```text
public/textures/terrain/baked/
  manifest.json
  displacement.r16f.bin
  gradient.rg16f.bin
  shell.f32.bin
```

- `displacement.r16f.bin`: the existing downsampled half-float height texture.
- `gradient.rg16f.bin`: the existing two-channel half-float gradient texture.
- `shell.f32.bin`: the displacement grid as floats for `sampleHeight`, link
  layout, contour extraction, and any other CPU consumers.
- `manifest.json`: dimensions, formats, byte lengths, source hash, and a config
  hash covering `contrast`, plane size, and terrain segment count.

This exact format changes no values. It removes EXR decoding and the expensive
blur/gradient loops, but it does not yet minimize transfer or GPU memory.

In the browser, a Suspense-compatible loader should fetch the manifest and
three buffers in parallel, validate byte lengths, and create:

- a `RedFormat` / `HalfFloatType` displacement `DataTexture`;
- an `RGFormat` / `HalfFloatType` gradient `DataTexture`;
- a `Float32Array`-backed `HeightGrid` for CPU sampling.

Use the same linear filters, clamp wrapping, and disabled mipmaps as the live
path. During development, retain a temporary query flag that can select the
old EXR path for A/B screenshots. Production should not request the EXR.

## Second implementation: bake terrain shadows

Current status: the complete static illumination is implemented in memory at
startup as an RG16F `DataTexture`, with one scalar contribution per point
light. It includes intensity, falloff, normal response, terrain visibility,
shadow strength, and slope shading. Keeping the channels separate preserves
independently adjustable light colors without rebaking. The fragment shader
retains only those colors, terrain albedo, edge fade, and fog.

The previous terrain fragment shader performed nine height samples for each of
two lights at every terrain pixel, then calculated normals, attenuation, and
diffuse response live. The runtime baker now stores both scalar light
contributions in one texture. A future offline artifact should use that output:

```text
static-lighting.rg16f.bin
```

Changing a light's position, intensity or falloff, terrain elevation, sea level,
shadow bias, or shadow strength requires a rebake. Light, base, and ridge colors
remain live because the baked texture stores scalar illumination.

The lighting artifact's config hash must include both light positions,
intensities and falloffs, elevation, sea level, shadow strength and bias,
contrast, plane size, mesh Y, and the ray-march constants. Changing any of
those values requires `npm run bake:terrain`; light colors do not.

## Optional compression after visual approval

Once exact artifacts match, test KTX2 for the GPU textures. Use a lossless or
high-precision mode for displacement; test BC5/UASTC-style two-channel
compression only for the gradient and shadow maps. Keep the exact `.bin`
artifacts as comparison fixtures until screenshots show no visible contour,
silhouette, or lighting regression at 390 px, 768 px, and 1440 px.

Compression is a delivery optimization, not a prerequisite for moving the CPU
work to build time.

## Preloading and cache invalidation

Preload the manifest and buffers from the homepage route or call the custom
loader's preload method before the Canvas mounts. Give generated files
content-hashed names in the manifest so they can be cached immutably. The HTML
should preload only the small manifest directly; it identifies the current
hashed artifacts and avoids stale URLs.

Add `npm run check:terrain-bake` to CI/build verification. It should recompute
the source/config hashes, compare them with the manifest, and fail with an
instruction to run `npm run bake:terrain` when artifacts are stale.

## Verification gate

Before deleting the live EXR path:

1. Capture identical-camera screenshots from live and baked paths at all three
   target widths and compare them with an image diff.
2. Confirm terrain controls either invalidate/rebake the cache or are clearly
   development-only when their inputs are part of a baked artifact.
3. Record cold-load main-thread time, decoded texture memory, steady-state GPU
   frame time, and artifact transfer size for both paths.
4. Verify reduced motion and WebGL fallback are unchanged.

Contour geometry can be serialized in a later pass without removing its shader
animation. Delay decor-stream baking until its planned animation model is
known, as agreed.
