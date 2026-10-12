# components/scene/travel

The Travel globe inside the canvas (`SceneCanvas` mounts it the first time Travel opens, then keeps it).

| File | Purpose |
| --- | --- |
| `TravelGlobe.tsx` | The sphere (dark ground, gold rim, small relief), graticule and coastlines; mounts the lights, rings and stars; pointer drag; per-frame turn (`lib/scene/travel.ts`); publishes the terrain patch frame, bloom objects and the captured trip |
| `TravelLights.tsx` | The night lights: land as light points sampled from the elevation map, denser in lowlands, standing on the relief and riding the planet on the way in |
| `TravelRings.tsx` | The faint orbit rings with tick marks about the resting globe, turning with the hand's turn (speed and direction), in with the lines |
| `TravelStars.tsx` | The sky behind the resting globe: a far sphere of stars, a few bright, faintly twinkling, slowly drifting about a tilted axis, in with altitude |
| `TravelTrails.tsx` | Trail tubes along each trip's recorded tracks, riding the relief, one line per trip across recording gaps, thinner with a trip open |
| `TravelCallouts.tsx` / `.css` | HTML markers placed every frame on the relief, no titles: a diamond for a trip at one place, hexes at the route's start and end for a trip with tracks, a stacked marker for nearby trips that fans out on a click, an open trip's stops named on hover; hover, focus (near the globe's centre) and selection states; the other trips fade with a trip open |
| `useCoastlines.ts` | Loads `public/travel/coast.bin` once |
| `useElevation.ts` | Loads `public/travel/elevation.png` once: a texture for the shaders and a CPU height sampler for markers |
| `useRegion.ts` | Loads `public/travel/region.png` and its `region.json` once: the real ground around the landing place, whose heights the landscape's edge takes and the globe draws on the zoom-out (`TerrainMesh`, `TravelGlobe`) |

Shaders: `shaders/terrain/globe.*` (the shell, its land colour from `landShading.glsl`, shared with the terrain
and the regional ground on the way in), `shaders/terrain/travelTrail.*` (solid or dotted tube),
`shaders/terrain/travelPoints.*` (lights and stars); the shell and points hide behind the riding terrain through its depth texture, while trails
and markers hide only behind the globe's body (`behindGlobe`). `TravelGlobe` places the globe for the entry
zoom-out and publishes the patch frame; the terrain's and contour lines' ride is in `shaders/terrain/terrain.vert`
and `shaders/terrain/contours.vert`.
