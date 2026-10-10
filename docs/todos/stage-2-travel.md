# Stage 2: Travel

Status: implemented (2026-10-08): routes, data, nav and scene link, the globe (relief, coastlines, lakes,
graticule) with rotation, capture and trip framing, the trip index and panel, and the continuous zoom-out
through baked regional ground; frame-checked in the browser, awaiting the user's review. Real content pending.

## Accepted direction

- Travel is separate from Blog and has a new linkstream; use the same destination
  from the top nav under the [shared navigation model](stage-2-navigation.md).
- Entry withdraws the linkstreams, pans and lifts the camera, and carries the terrain
  into a full globe view through continuous expressive motion. Motion blur is part
  of the proposed transition, not a geographically literal zoom from the invented terrain.
- The transition must feel like a transformation rather than a visible scene swap.
  If direct continuity is visually weak, explore dissolving terrain into a particle
  cloud that loses its invented shape and reforms as the globe during the zoom-out.
  This is an alternative to test, not a mandated additional effect.
- The globe is drag-rotatable, with highlighted trails and markers reflecting actual
  traveled locations. Geography and routes are real, unlike About's metaphorical path.
- Selecting a trip zooms and enlarges the globe toward a quarter-sphere composition,
  leaving space for the trip introduction and links to a photo gallery or blog article.
  Orientation remains open; not every trip needs an article.
- Quick photo inspection can use a popover/viewer. Long articles need a spacious,
  addressable reading state with a reliable return to the selected trip.
- Return preserves trip selection and globe position; mechanics belong to
  [Loading and return](stage-2-loading-and-return.md). Blog itself is not redesigned.

## Accepted decisions (2026-10-07)

- Globe look A: thin gold coastlines (and the large lakes) with a 15° graticule on the terrain's dark
  ground, no photographic texture. Continents are drawn as a survey map from a baked elevation map:
  a small relief and hillshade so ranges, plateaus and basins read; land a shade lighter than sea.
  Trails and markers take the About trail colour. The map's own contour lines were dropped
  (2026-10-08): over coastlines and graticule they read as a tangle.
- Look B (2026-10-09, chosen from a live prototype of three hologram directions): a night globe. The dark
  ground with a gold rim, land a field of gold light points (denser in lowlands, loose clusters standing in
  for cities until real data arrives), faint coastlines and graticule, two tilted orbit rings with tick marks
  turning slowly about the globe, and a sparse sky of stars behind it; no hillshade. Lights, rings and stars
  bloom. On the way in the lights come on over the dark ground as the landscape recedes.
- The regional ground mesh was dropped (2026-10-09): with the night look the ground is dark everywhere, so
  the globe draws it from the first frame and the landscape's edge turns opaque to meet it, which removed the
  tile's circular rim and its half-way hand-over from the zoom-out.
- The landscape, the regional ground and the globe share one land formula
  (`shaders/terrain/landShading.glsl`, 2026-10-08): on the way the landscape's pool of light gives way to
  the same north-west hillshade on its own relief, so no lit disc shows against the ground.
- Entry (revised 2026-10-08, after researching how the field does it: geometric distance, nested
  resolutions, a planet the ground belongs to): one continuous zoom-out in which the globe is the planet
  the landscape lies on. The landscape stands for `landscapeKm` of real ground, which sizes an Earth-scale
  planet; it shrinks geometrically to the globe over the 2 s journey while the terrain, the home contour
  lines and a baked tile of the real ground around the landing place ride on its surface at the matching
  scale, heights above sea level. The landscape's edge fade hands its heights and colour over to that
  ground, so there is no board; the ground is drawn in the globe's own colours and the globe reads the
  same tile inside its footprint, so the tile mesh can leave half-way without a seam. Haze thins with
  altitude; graticule, coastlines and trails arrive late like map labels; the globe's relief goes from
  real to the map's exaggeration as it arrives. Leaving plays it backwards. The video-cheat alternative
  (an Earth Studio render between the ends) stays rejected: photographic imagery against the survey-map
  look, a real place under an invented landscape, a watermark, 18 MB.
- The camera parks at the Travel pose; the globe rotates. Dragged, the surface follows the
  pointer; released, it coasts under friction and, once slower than the snap threshold, the
  nearest trip within the capture angle pulls it in (free coast with capture, idle drift when
  resting on no trip). Values: friction 2.6, snap below 40°/s, capture 35°, snap rate 5.
- Composition: overview keeps the globe left with the trip index as a right-hand column;
  a selected trip shifts and dollies the camera (globe lower left, text right) while the globe
  turns the trip to an offset from its centre. Phones keep the globe above a sheet.
- Routes `/travel` and `/travel/[trip]`, `?photo=` for the viewer; Travel in the top nav and a
  fifth scene link. Stories are Blog MDX; every trip has an intro, photos and article optional.
- Placeholder content: G318 (two recordings that do not meet, their gap drawn dotted) and Mont
  Ventoux (one place). Dates, days and distances are invented until the real data arrives.
- Geography is baked, never hand-placed: `scripts/assets/build-travel-geo.mjs` simplifies
  Natural Earth 110m coastlines and lakes (public domain) to `public/travel/coast.bin` (20 KB at
  5 km), resizes NASA's gebco_08_rev_elev topography (public domain, linear, saturating near 4,600 m)
  to `public/travel/elevation.png` (2048×1024, 8-bit grey, 550 KB), fetches Terrarium elevation tiles
  (AWS Open Data: SRTM, GMTED2010, ETOPO1; attribution required, see production) for the 600 km around
  the landing place into `public/travel/region.png` + `region.json` (1024², 860 KB), and simplifies GPX
  recordings to track JSON. The landing place is the plateau edge west of Chengdu (102.0°E, 30.05°N);
  the landscape lands where that tile is centred, so changing it is one rebake.
- In development the pointer belongs to the globe on Travel; Leva's Travel › Edit camera hands it
  to the orbit camera for Save Camera.

## Open prototype decisions

- Review in the live scene: the zoom-out (landscape width in km, journey time, when haze thins and
  lines arrive, the tile's hillshade gain against the globe's, the tiny dark remnant of the landscape
  just before it is sub-pixel), globe size and pose, relief, hillshade, coastline weight, marker offset, the selected composition, capture feel, the panel's type and
  spacing, the phone sheet.
- Attribution for the Terrarium-derived tile (Mapzen/Tilezen, SRTM, GMTED2010, ETOPO1) and Natural
  Earth needs a visible home, with the artwork credits; track in production.
- Entry from About or Art starts the zoom-out from that camera, not the overview; the anchor is pinned
  to the landscape over the first tenth, so it holds, but review how the first second reads from there.
- Direct entry to `/travel/[trip]` opens at the overview pose with the trip turned to its marker;
  the focus pose is only known once the globe has mounted. Decide whether to start there instead.
- Motion blur during the zoom-out was part of the brief; there is none yet. Judge whether it needs
  any once the zoom-out is tuned.
- Track loading for real recordings: inline segments today; add a fetched `public/travel/tracks`
  source when the first GPX arrives. Representative photos and an article.
- Keyboard: arrows step trips and Escape returns to the overview; the globe itself is not focusable.

## Work and validation

- [x] Prototype terrain → globe → selected trip → media/reading → return.
- [ ] Verify the entrance reads as continuous motion rather than a globe swap.
- [ ] Populate representative real trips, including a photo-only trip.
- [ ] Verify selection, readable details, rotation and local return across input modes.
- [ ] Verify direct entry and history with the shared navigation work.

## Reference

User's illustrated brief and clarified direction, 2026-09-30, in this chat; decisions and the plan page
(route map, storyboard, rotation demo, mockups) agreed 2026-10-07.
Source illustration: `6190261734833067765.jpg` (Travel).
