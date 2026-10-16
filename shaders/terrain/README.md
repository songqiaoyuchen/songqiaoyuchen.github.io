# shaders/terrain

| File | Used by | Purpose |
| --- | --- | --- |
| `landShading.glsl` | `terrain.frag`, `globe.frag` | The one land colour (ground darkening as the planet turns away, land tint by height, north-west hillshade) as the `<land_shading>` chunk, registered by `lib/scene/landShading.ts`; reads the regional tile ever more coarsely toward its edge |
| `terrain.vert` / `terrain.frag` | `TerrainMesh` | Displaced, lit terrain surface, falling to the background with plan distance (rendered unblended into the cache, the fade as alpha); rides onto the Places globe, taking the land shading on its own relief |
| `terrainComposite.frag` | `CachedTerrain` | Cache over the background + oil/pencil/digital backdrops, contour wipe, fog, cursor, capture |
| `contours.vert` / `contours.frag` | `Contours` | Contour tubes with pulse, the intro reveal (lit where the summit's wave has passed by the reach field, a ghost ahead of it, a flash behind its front), depth occlusion; About's map adds terrain lighting and distance dimming; the home lines ride onto the Places globe |
| `aboutPath.vert` / `aboutPath.frag` | `AboutPath` | About route tube: solid travelled part, dashed trail ahead, depth occlusion |
| `globe.vert` / `globe.frag` | `PlacesGlobe` | The Places globe as a survey map: relief and hillshade from the elevation map (the regional tile inside its footprint), rim, per-fragment fog on the way, the cached terrain composited over the ground by its edge fade; with a location open, eases into a raised-relief map (the elevation summary, heightened and hillshaded) |
| `placesLens.glsl` | `globe.*`, `globeLine.vert`, `placesPoints.vert`, `placesTrail.vert` | The open location's conformal zoom as the `<places_lens>` chunk: the warp and its inverse, relief gain, the map shift under a drawn direction (same maths as `lib/scene/placesLens.ts`) |
| `globeLine.vert` / `globeLine.frag` | `PlacesGlobe` | Graticule and coastlines: lines moved by the zoom, flat colour |
| `placesPoints.vert` / `placesPoints.frag` | `PlacesLights`, `PlacesStars` | Light points at a screen size: the globe's night lights standing on its relief, and the stars behind it (twinkling, warm-to-cool); terrain-depth occlusion |
| `placesTrail.vert` / `placesTrail.frag` | `PlacesTrails` | Location trail tubes riding the globe's relief, dotted across recording gaps, terrain-depth occlusion |
