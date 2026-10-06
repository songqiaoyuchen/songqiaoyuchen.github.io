# scripts/bake

| File | Command | Purpose |
| --- | --- | --- |
| `bake-terrain.mjs` | `npm run bake:terrain` / `check:terrain-bake` | Bakes heightmap artifacts and contours into `public/textures/terrain/baked/`; `--check` runs before every build |
| `bake-oil-terrain.mjs` | `npm run bake:oil` | Legacy: oil pigment/relief maps for the retired oil terrain shader; nothing on the live site reads them |
