# Terrain baking

Read when changing terrain inputs or loading. Configuration lives in
`config/scene/`; generation lives in `scripts/bake-terrain.mjs`.

Run `npm run bake:terrain` after changing geometry, contour extraction,
displacement, elevation, sea level, scalar lighting, or shadow inputs.
Light/base/ridge colors remain live. The script's hash inputs govern invalidation.
`npm run check:terrain-bake` validates hashes/sizes and runs before builds.

## Artifacts

`public/textures/terrain/baked/manifest.json` describes hashed gzip files:

| Artifact | Purpose |
| --- | --- |
| `displacement.*.r16f.bin.gz` | Height texture |
| `shell.*.f32.bin.gz` | CPU sampling grid |
| `static-lighting.*.rg16f.bin.gz` | Two scalar light contributions |
| `contours.*.contour-v1.bin.gz` | Packed contour geometry |
| `gradient.*.rg16f.bin.gz` | Development-only live lighting |

The source is `public/textures/terrain/heightmap.exr`; production loads baked
artifacts instead. The worker fetches/decompresses sequentially, validates, and
transfers buffers. Main-thread adapters attach textures/geometry in stages.
Development can rebuild contours and lighting. Decorative streams stay live.

Follow [workflow](workflow.md) for automatic checks. After bake/input changes,
run the freshness check; browser comparisons and performance/failure audits
belong to a requested review, not every implementation session.
