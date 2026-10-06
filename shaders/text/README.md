# shaders/text

| File | Used by | Purpose |
| --- | --- | --- |
| `sceneText.vert` / `sceneText.frag` | `SceneLinks`, `SceneHeroName` | Billboarded SDF glyphs, hover swaps, pixel dissolve |
| `glyphRain.vert` / `glyphRain.frag` | `GlyphRain` | Falling bitmap glyph columns |
| `glyphRainComposite.vert` / `.frag` | `GlyphRain` | Adds the blurred layers with a pixel dissolve |
