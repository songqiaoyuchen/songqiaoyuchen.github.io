# lib

Framework-free logic: maths, geometry, loaders and workers. Modules that node scripts also load use
relative imports with `.ts` extensions (see `scripts/README.md`).

| Folder | Purpose |
| --- | --- |
| `art/` | Art section logic: carousel layout, backdrop wipe, cursor fields, live settings, capture |
| `content/` | MDX article loading |
| `scene/` | Camera maths, text dissolves, startup pacing, full-screen passes |
| `terrain/` | Baked terrain pipeline: worker, assets, contours |
| `text/` | Glyph atlases and WebGL text geometry/layout |
| `travel/` | Travel photo viewer layout |
