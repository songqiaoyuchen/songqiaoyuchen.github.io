# shaders/terrain

| File | Used by | Purpose |
| --- | --- | --- |
| `terrain.vert` / `terrain.frag` | `TerrainMesh` | Displaced, lit terrain surface (rendered into the cache) |
| `terrainComposite.frag` | `CachedTerrain` | Cache + oil/pencil/digital backdrops, contour wipe, fog, cursor, capture |
| `contours.vert` / `contours.frag` | `Contours` | Contour tubes with pulse, intro sweep and depth occlusion |
