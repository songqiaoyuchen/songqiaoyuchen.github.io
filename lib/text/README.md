# lib/text

Geometry and layout for text drawn in WebGL (used by `components/scene/text`).

| File | Purpose |
| --- | --- |
| `atlas.ts` | Texture setup for the SDF atlas (scene links, hero name) and bitmap atlas (glyph rain) |
| `sceneLinkGeometry.ts` | Glyph quads for the vertical scene links and the horizontal hero name |
| `sceneLinkLayout.ts` | Projects screen-space slots onto the terrain for each scene link layout |
| `glyphRainGeometry.ts` | Seeded glyph rain columns split into depth layers |
| `glyphRainCompositor.ts` | Renders, blurs and adds the glyph rain layers offscreen |
