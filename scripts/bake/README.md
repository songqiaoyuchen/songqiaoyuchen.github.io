# scripts/bake

| File | Command | Purpose |
| --- | --- | --- |
| `bake-terrain.mjs` | `npm run bake:terrain` / `check:terrain-bake` | Bakes heightmap artifacts and contours into `public/textures/terrain/baked/`; `--check` runs before every build |
| `bake-lake.mjs` | `npm run bake:lake` / `check:lake-bake` | Bakes the lake dive's crack walls (radius per station and ring angle, `lib/scene/lakeBake.ts`) into `public/lake/baked/`; `--check` runs before every build and recomputes a sample of stations, so rerun the bake after changing the route, the walls or their config |
| `bake-oil-terrain.mjs` | `npm run bake:oil` | Legacy: oil pigment/relief maps for the retired oil terrain shader; nothing on the live site reads them |
