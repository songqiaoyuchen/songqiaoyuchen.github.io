# Terrain baking

Read when changing terrain inputs or loading. Configuration lives in
`config/scene/`; generation lives in `scripts/bake/bake-terrain.mjs`.

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
Development can rebuild contours and lighting. The glyph rain stays live.

Diffuse crop coordinates are top-left pixels of the original 4097-square
`diffuse_map.png`; the approved crop lives at the top of `scripts/bake/bake-oil-terrain.mjs`.
The oil maps are legacy: the oil terrain shader that read them was retired (see git history), and the
live oil backdrop is a painted image (`config/art/backdrop.ts`). Review changes
in the actual `/artworks` scene with its camera, fog, compositing, and overlays.

After diffuse/crop, terrain geometry, or stroke-generator changes, run `npm run bake:oil` and retain
both WebP maps plus `oil-bake.json`. This separate bake does not change displacement
or the existing terrain-lighting artifacts. The generator uses deterministic,
four-layer strokes following the baked height field's slopes (with a color
structure tensor in flat areas). Each stroke selects from four pigment families,
each with six tonal values, using slope lighting, coherent color regions, and
simplified diffuse color. Light/shadow boundaries receive
fine accents; shuffled stroke order avoids repeating rows. Pigment and bristle
relief are baked in terrain UV space, keeping marks attached during camera movement.
The retired shader added a distant glaze, surface-normal paint relief, and a restrained
paint sheen while retaining baked tonal planes.

Method reference: [Wet Paint Flow](https://github.com/simonxxooxxoo/wet-paint-flow)
(layered directional strokes and separate paint-height shading). The generator is
an independent static-terrain implementation; it does not include that project's
interactive stroke growth, wet-fluid behavior, source code, or image assets.

Follow [workflow](workflow.md) for automatic checks. After bake/input changes,
run the freshness check; browser comparisons and performance/failure audits
belong to a requested review, not every implementation session.
