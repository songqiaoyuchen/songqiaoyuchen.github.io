# shaders/terrain

| File | Used by | Purpose |
| --- | --- | --- |
| `terrain.vert` / `terrain.frag` | `TerrainMesh` | Displaced, lit terrain surface, falling to the background with plan distance (rendered into the cache) |
| `terrainComposite.frag` | `CachedTerrain` | Cache + oil/pencil/digital backdrops, contour wipe, fog, cursor, capture |
| `contours.vert` / `contours.frag` | `Contours` | Contour tubes with pulse, intro sweep, depth occlusion; About's map adds terrain lighting and distance dimming |
| `aboutPath.vert` / `aboutPath.frag` | `AboutPath` | About route tube: solid travelled part, dashed trail ahead, depth occlusion |
