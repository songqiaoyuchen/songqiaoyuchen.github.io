# Terrain pre-baking guide

Status: implemented on 2026-07-29. Visual equivalence and loading measurements
remain part of the verification gate.

## Objective

Move deterministic terrain work out of the browser without reducing terrain
detail. The production page should download ready-to-upload textures and CPU
grids instead of decoding the 33 MB EXR and rebuilding them on every cold load.

The legacy browser pipeline was:

1. Decode `public/textures/terrain/heightmap.exr`.
2. Convert its first channel from half-float and sRGB.
3. Blur and downsample a displacement grid.
4. Calculate the two-channel height gradient at full source resolution.
5. Smooth the CPU shell grid, extract contour polylines, and expand their tube buffers.

All five steps are deterministic for the checked-in heightmap and scene config.
Keep decor-stream geometry live because its content is animated at runtime.

## Implemented artifact pipeline

`scripts/bake-terrain.mjs` and `npm run bake:terrain` generate deterministic
terrain data from the checked-in EXR and current scene configuration.

The script should produce this directory:

```text
public/textures/terrain/baked/
  manifest.json
  contours.<content-hash>.contour-v1.bin.gz
  displacement.<content-hash>.r16f.bin.gz
  gradient.<content-hash>.rg16f.bin.gz
  shell.<content-hash>.f32.bin.gz
  static-lighting.<content-hash>.rg16f.bin.gz
```

- `contours.contour-v1.bin`: packed index and vertex-attribute buffers for the
  default contour geometry, ready for direct Three.js attachment.
- `displacement.r16f.bin`: the existing downsampled half-float height texture.
- `gradient.rg16f.bin`: the existing two-channel half-float gradient texture.
- `shell.f32.bin`: the displacement grid as floats for `sampleHeight`, link
  layout, development contour rebuilds, and any other CPU consumers.
- `static-lighting.*.rg16f.bin.gz`: the two baked scalar light contributions.
- `manifest.json`: dimensions, formats, byte lengths, source hash, and a config
  hash covering terrain geometry, contour generation, displacement, and
  lighting inputs.

The raw values remain exact. Production downloads the displacement, shell,
static-lighting, and contour artifacts (approximately 6.3 MB compressed), while
removing EXR decoding and all deterministic blur, gradient, lighting, smoothing,
marching-squares, polyline, and tube-expansion loops from the startup path. The
full-resolution gradient artifact is development-only because it is needed
solely when live-lighting controls diverge from the baked config.

In production, the dedicated terrain worker fetches the manifest and compressed
buffers sequentially to bound CPU and memory contention, then decompresses and
validates them. The main thread creates:

- a `RedFormat` / `HalfFloatType` displacement `DataTexture`;
- a `Float32Array`-backed `HeightGrid` for CPU sampling.
- an `RGFormat` / `HalfFloatType` static-lighting `DataTexture`;
- a `BufferGeometry` adapter over the transferred, prebaked contour attributes.

The loader uses the same linear filters, clamp wrapping, and disabled mipmaps
as the legacy path. Production requests neither the EXR nor the gradient.
Development additionally loads an `RGFormat` / `HalfFloatType` gradient
`DataTexture`, allowing controls to fall back to a live lighting rebake when a
scalar lighting value differs from the checked-in configuration. Changing a
development contour geometry control requests a worker rebuild while retaining
the previous geometry until the replacement is ready.

## Static terrain lighting

The complete static illumination is generated offline as an RG16F artifact,
with one scalar contribution per point light. It includes intensity, falloff,
normal response, terrain visibility, shadow strength, and slope shading.
Keeping the channels separate preserves independently adjustable light colors.

The previous terrain fragment shader performed nine height samples for each of
two lights at every terrain pixel, then calculated normals, attenuation, and
diffuse response live. The runtime baker now stores both scalar light
contributions in one texture. The offline artifact is:

```text
static-lighting.<content-hash>.rg16f.bin.gz
```

Changing a light's position, intensity or falloff, terrain elevation, sea level,
shadow bias, or shadow strength requires a rebake. Light, base, and ridge colors
remain live because the baked texture stores scalar illumination.

The lighting artifact's config hash must include both light positions,
intensities and falloffs, elevation, sea level, shadow strength and bias,
contrast, plane size, mesh Y, and the ray-march constants. Changing any of
those values requires `npm run bake:terrain`; light colors do not.

## Optional texture compression after visual approval

The exact artifacts are gzip-compressed for delivery. After they match, test
KTX2 for the GPU textures. Use a lossless or
high-precision mode for displacement; test BC5/UASTC-style two-channel
compression only for the gradient and shadow maps. Keep the exact `.bin`
artifacts as comparison fixtures until screenshots show no visible contour,
silhouette, or lighting regression at 390 px, 768 px, and 1440 px.

Compression is a delivery optimization, not a prerequisite for moving the CPU
work to build time.

## Preloading and cache invalidation

The homepage loads the manifest before the Canvas assets suspend. The global
home link warms the small manifest on pointer hover or keyboard focus. Generated
buffers are content-hashed and cached immutably; the manifest revalidates.

`npm run check:terrain-bake` recomputes the source/config hashes, checks the
manifest and artifact sizes, and runs automatically before the production
build. It fails with an instruction to run `npm run bake:terrain` when stale.

## Verification gate

Before deleting the live EXR path:

1. Capture identical-camera screenshots from live and baked paths at all three
   target widths and compare them with an image diff.
2. Confirm terrain controls either invalidate/rebake the cache or are clearly
   development-only when their inputs are part of a baked artifact.
3. Record cold-load main-thread time, decoded texture memory, steady-state GPU
   frame time, and artifact transfer size for both paths.
4. Verify reduced motion and WebGL fallback are unchanged.

The contour shader animation remains live; only its deterministic default
geometry is serialized. Keep decor streams out of the static terrain bake:
their accepted stepped glyph cascade depends on live shader time and a
periodically refreshed depth-blur compositor (D-012).
