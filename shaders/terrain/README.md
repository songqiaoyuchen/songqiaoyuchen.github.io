# shaders/terrain

| File | Used by | Purpose |
| --- | --- | --- |
| `landShading.glsl` | `terrain.frag`, `globe.frag` | The one land colour (ground darkening as the planet turns away, land tint by height, north-west hillshade) as the `<land_shading>` chunk, registered by `lib/scene/landShading.ts`; reads the regional tile ever more coarsely toward its edge |
| `terrain.vert` / `terrain.frag` | `TerrainMesh` | Displaced, lit terrain surface, falling to the background with plan distance (rendered unblended into the cache, the fade as alpha); rides onto the Travel globe, taking the land shading on its own relief |
| `terrainComposite.frag` | `CachedTerrain` | Cache over the background + oil/pencil/digital backdrops, contour wipe, fog, cursor, capture |
| `contours.vert` / `contours.frag` | `Contours` | Contour tubes with pulse, intro sweep, depth occlusion; About's map adds terrain lighting and distance dimming; the home lines ride onto the Travel globe |
| `aboutPath.vert` / `aboutPath.frag` | `AboutPath` | About route tube: solid travelled part, dashed trail ahead, depth occlusion |
| `globe.vert` / `globe.frag` | `TravelGlobe` | The Travel globe as a survey map: relief and hillshade from the elevation map (the regional tile inside its footprint), rim, per-fragment fog on the way, the cached terrain composited over the ground by its edge fade; with a trip open, eases into a raised-relief map (the elevation summary, heightened and hillshaded) |
| `travelPoints.vert` / `travelPoints.frag` | `TravelLights`, `TravelStars` | Light points at a screen size: the globe's night lights standing on its relief, and the stars behind it (twinkling, warm-to-cool); terrain-depth occlusion |
| `travelTrail.vert` / `travelTrail.frag` | `TravelTrails` | Trip trail tubes riding the globe's relief, dotted across recording gaps, terrain-depth occlusion |
