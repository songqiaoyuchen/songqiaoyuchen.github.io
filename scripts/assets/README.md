# scripts/assets

| File | Purpose |
| --- | --- |
| `sync-artwork-dimensions.mjs` | `npm run sync:artwork-dimensions`: writes image sizes into `data/artworks.ts` |
| `generate_font_atlas.py` | Builds the SDF glyph atlas for scene text (`stream-atlas.png`) |
| `generate_glyph_rain_atlas.py` | Builds the bitmap glyph atlas for the glyph rain (`decorative-atlas.png`) |
| `capture-pencil-source.mjs` | Captures the bare terrain at the Art pose as a source for backdrop paintings |
| `register-illustration.mjs` | Measures (and with `--apply` corrects) a backdrop painting's drift from that capture |
