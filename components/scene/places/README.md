# components/scene/places

The Places globe inside the canvas (`SceneCanvas` mounts it the first time Places opens, then keeps it).

| File | Purpose |
| --- | --- |
| `PlacesGlobe.tsx` | The sphere (dark ground, gold rim, small relief), graticule and coastlines; mounts the lights, rings and stars; pointer drag; per-frame turn (`lib/scene/places.ts`); the open location's zoom (`lib/scene/placesLens.ts`); publishes the terrain patch frame, bloom objects and the captured location |
| `PlacesLights.tsx` | The night lights: land as light points sampled from the elevation map in the places worker, denser in lowlands, standing on the relief and riding the planet on the way in |
| `PlacesRings.tsx` | The faint orbit rings with tick marks about the resting globe, turning with the hand's turn (speed and direction); on the zoom-out, in only once the planet is near the globe's size |
| `PlacesStars.tsx` | The sky behind the resting globe: a far sphere of stars, a few bright, faintly twinkling, slowly drifting about a tilted axis, in with altitude |
| `PlacesTrails.tsx` | Trail tubes along each path's recorded tracks, riding the relief, one line per path across recording gaps, thinner with a location open, the other locations' leaving with their markers |
| `PlacesCallouts.tsx` / `.css` | HTML markers placed every frame on the relief, no titles: a diamond for a location at one place, a path marked by its route alone, a stacked marker for nearby locations that fans out on a click, an open location's stops, each always named, beside it or, where names crowd, out on a leader line; hover, focus (near the globe's centre) and selection states; the other locations fade with a location open |
| `LocationIcon.tsx` | A location's own marker drawing in place of the diamond (`icon` in `data/places.ts`), at three levels of detail picked by the marker's state |
| `useCoastlines.ts` | Loads `public/places/coast.bin` once |
| `useElevation.ts` | Asks the places worker (`lib/scene/placesElevation.ts`) for `public/places/elevation.png` decoded, its summary and the light points once: textures for the shaders and a CPU height sampler for markers |
| `useLocationGround.ts` | Loads a location's own ground (`public/places/ground/<id>.webp` and `.json`) on its first open: 16-bit heights as a half-float texture with mip levels built on the CPU |
| `useRegion.ts` | Loads `public/places/region.png` and its `region.json` once: the real ground around the landing place, whose heights the landscape's edge takes and the globe draws on the zoom-out (`TerrainMesh`, `PlacesGlobe`) |

Shaders: `shaders/terrain/globe.*` (the shell, its land colour from `landShading.glsl`, shared with the terrain
and the regional ground on the way in), `shaders/terrain/placesTrail.*` (solid or dotted tube),
`shaders/terrain/placesPoints.*` (lights and stars); the shell and points hide behind the riding terrain through its depth texture, while trails
and markers hide only behind the globe's body (`behindGlobe`). `PlacesGlobe` places the globe for the entry
zoom-out and publishes the patch frame; the terrain's and contour lines' ride is in `shaders/terrain/terrain.vert`
and `shaders/terrain/contours.vert`.
