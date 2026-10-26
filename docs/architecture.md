# Architecture

Current implementation map, not a fixed design direction. Update when structure changes.
Each source folder has a `README.md` listing its files; this page explains how they fit together.

## Stack and layout

Next.js App Router, React, TypeScript, Tailwind; React Three Fiber/Three.js,
Drei, post-processing, and GLSL for terrain. Motion supports interactions.

| Location | Responsibility |
| --- | --- |
| `app/` | Routes, layout, metadata, development API |
| `components/shell/` | Persistent Home/About/Art/Places shell: one scene, loading state, fallback, article summaries |
| `components/home/` | Homepage hero, preloader and preview drawer (About, Blog, Projects panels) |
| `components/art/` | Art section: carousel, collection, inspection, gallery transition, Screenshot mode |
| `components/places/` | Places section: location index, location panel, photo viewer, shared scene state |
| `components/lake/` | The lake dive's HTML: flow, dive screen (HUD and input), the letter |
| `components/scene/`, `shaders/` | WebGL: camera, terrain, backdrops, scene text, effects, Leva controls |
| `components/site/`, `components/projects/`, `components/blog/` | Nav, project cards, editorial UI |
| `config/` | Tunable numbers (scene, art, places, hero, preloader, breakpoints) |
| `data/` | Copy and content: sections, hero, About, projects, blog drawer, artworks |
| `styles/` | Global CSS entry, design tokens, base and shared utilities |
| `lib/` | Framework-free logic: terrain pipeline, text geometry, art and scene maths, MDX loading |
| `content/`, `mdx-components.tsx` | MDX articles and their registered components |
| `public/`, `scripts/` | Fonts, media, baked assets; bake, asset, test and verify tools |

Names used throughout: **scene links** are the WebGL ART / PROJECTS / BLOG / ABOUT / PLACES words that open
sections; **glyph rain** is the faint falling letter columns behind them; a **backdrop** is the terrain
re-rendered as oil, pencil or digital behind the Art gallery, swapped by a **backdrop wipe**.

## Home

The homepage is a single viewport with a preloader, WebGL scene, and preview
drawers. Home and Art share a persistent route-group layout (`(scene)`, mounting `SceneShell`); direct
Art entry exposes content while the terrain prepares, and a warm return Home retains
the canvas. Other sections retain their existing lifecycles.
Scene text dissolves into pixels on section changes. Scene link layouts change only
while fully hidden; scene links and the hero name reveal after camera arrival. The hero name is HTML by default
(`HeroName`: a glyph scramble on entrance and on hover or tap, a text-shadow glow); `HERO_NAME_RENDERER` in
`config/hero.ts` switches Home to the WebGL name (`SceneHeroName`) instead.
First arrival is one sequence from the preloader's mark to the landscape, and the camera never moves. While the
terrain loads, the mark's highlight spirals and the real stage under way is named beneath it (the worker's
fetches, then the shaders' first frames; `PRELOADER_CONFIG.stages`, the worker's progress forwarded by
`lib/terrain/assets.ts`). Once the scene is ready and held a moment, the cover takes over (`IntroInk`, a WebGL2
canvas in the preloader), in two stages. First the map: a 2D brush at the page's resolution holds the strokes, the
mark's own rings where its SVG stood, then one isoline after another outward (`lib/intro/inkPlan.ts`: a height
field seeded by the mark's outline, `lib/intro/mapField.ts`, the mark's own offsets close in giving way to hills,
basins and ridges of its own further out, values still climbing outward so the map accretes from the mark), until
the screen is a contour map. Then the reveal: every line widens into a band (`shaders/intro/ink-sim.frag`, a
half-resolution texture dilated a fraction of a texel a frame) whose edge is the gold line and whose inside is
see-through (`ink-out.frag`: black paper with the preloader's glow, gold lines and band edges, open insides), until
the bands have met and the last of the cover fades. As it lifts the terrain draws its own lines: the wave from
the summit sets off then, in view (`IntroReveal` runs the clock from the shell's `revealStarted`;
the terrain worker builds the reach field, `lib/terrain/reach.ts`, distances over the terrain from the highest
point near the overview's point of regard, `revealOriginX/Z`); each line shows where the wave has passed, a faint
ghost ahead of it and a flash just behind its front (`contours.vert`/`.frag`). The geometry never moves, so lines
never cross. The scene text waits under the cover (`CameraRig` `holdSceneText`); the preloader goes when the cover
has lifted and the hero and scene links enter then as after any journey. Settings: the map and the reveal in
`INTRO_CONFIG` (Leva's Intro, read live by the preloader), the wave in `CONTOUR_CONFIG.reveal*` (Leva's Contour
Lines › Reveal, whose Replay button replays the wave). Entry on a section route, reduced motion and browsers
without WebGL2 skip it: the preloader then fades over the scene at its own pose.
Art hides all scene text from navigation start, independently of backdrop loading.

## Lake

The lake (`LAKE_CONFIG`, `config/scene/lake.ts`) lies on the open plain below the hero: `LakeSurface` draws a
water disc at a set level, cut to a noise-moved shore and hidden by the terrain cache's depth where the ground
rises above it, so the terrain cuts its own shores (`shaders/lake/lake.*`). It glows on hover; an HTML button over
it (clickable, focusable) is the only way into the dive: no nav entry, no route. The flow (`useLakeFlow`,
`LAKE_FLOW`) runs on timers the camera's flights read too: `entering` flies the camera from the overview down to
`divePosition` over the water while the veil (`.lake-veil`, black) darkens; `diving` shows the crack and lifts the
veil; `found` stops the craft facing the bottle until the player opens it (the letter); `surfacing` darkens the
veil; `returning` sets the camera
above the water and flies it back to the overview pose (`getCameraPose(null, isMobile)`, so `CameraRig` finds it
where it left it). `LakeDive` owns the camera at priority -0.74, after `CameraRig`; the dev orbit controls are off
while the lake is active. Under water (`isUnderwater`) the canvas renders at no more than `maxPixelRatio` (the overview's own comes back
on surfacing), the bloom pass draws a cheap glow twin of the walls (`crackGlow.frag`, on the bloom layer alone)
instead of the walls themselves, the terrain cache is neither redrawn nor composited (`CachedTerrain` `hidden`), the contours, glyph rain, scene links and hero hide as for a section, `body[data-lake]`
steps the nav aside, and Escape or the HUD's Surface control is the way out; a section opening or the route leaving
ends the dive at once.

The crack (`lib/scene/lake.ts`, node-tested) is a route of control points stepping down from under the lake at a
set pitch, its bend drifting with inertia under a cap (`yawBend`) and dying away over a straight run into the
chamber (`straightEnd`), so the end wall shows ahead; sampled into stations with a level frame (the slot's gap axis is horizontal); the
cross-section is a squared-off slot per station (`slotPower`): two rock faces either side of the route, a gap
apart, standing near-vertical to a floor and a lake bed `halfHeight` away, far beyond the sonar, so above and
below is void. The faces carry the relief, bedded rock: broad bulges, blocks and spalls a unit or two across with
their edges sharp (`wallMid`, fading out high up the faces), ledges stepping where the beds change, and a little
finer roughness, pinched at set shares of the route, opening into a chamber at the end and closed at both ends;
the ring's vertices run up each face by height, densest about the gap. The finest grain is a scanned cliff
(`public/textures/lake/cliff-1k.webp`, Poly Haven's CC0 "Cliff Side" packed by `scripts/assets/pack-lake-rock.mjs`:
normal, height and occlusion in one map), loaded only once the player heads for the water and laid on the walls
triplanar at two scales: its height map pushes the vertices a little for rock close by (`rockRelief`, well under
the craft's clearance, fading with distance so far silhouettes stay clean), its normal tilts the shading and its
crevices hold back the return (`rockOcclusion`). The depth lines flare in each ping front's wake and fade within
the second: they are the sonar's alone, never in the afterimage or the resting light. The same radius function builds the mesh and answers the queries: `locate` (a point's
frame and place in the cross-section), `wallDistance` (a ray to the wall, for the readouts) and `advanceCraft`
(direction from the player alone, free in every direction so a corner is never a trap; fixed speed; the move
taken in `collisionStep` sub-steps each kept off the walls, the heading easing along a wall it is pressed against
at `slideEase`; a knock that cuts the speed to `bumpSlow` and slides along the wall with
the system's warning repeating while the contact lasts and a jolt of the view (`bumpKick`); never past the ends; nothing steers for the player; the
chamber runs at `chamberSpeed` so the bottle can be aimed at, and at its end wall the craft holds still). The walls are
seen by sonar (`shaders/lake/crack.frag`) and, within `ambientReach`, by a faint resting light: one ping is sent as
the crack comes into view, then each ping (space, enter, click or tap, on a cooldown the HUD shows as a bar) is an
origin and a time, with a sound (`lib/lake/sonarSound.ts`: the recorded sample at `soundSrc` when one is
configured, else a synthesised ping ringing into a convolver's tail); its front travels out at `pingSpeed`, the
walls light as it
passes by how squarely they face it, the depth lines (world height, gold) draw on them, the front itself is cyan,
and what the front has passed decays over `pingDecay`, the return weakening with distance. The HUD (`LakeHud`,
HTML) reads the dive's telemetry each frame through a shared ref and writes the player's input into another: wall
readouts, live soundings each side every frame that a ping in flight caps at its front so they count up with it,
depth and speed in metres (`metresPerUnit`), a scanning label, how to scan until the first ping, the hint until
the first input, and after a finished dive a skip that lands a way before the bottle, facing it, with the
revealing scan sent (`placeCraftBeforeBottle`). The dive ends when a scan has reached the bottle while it lies
ahead within `foundRange`, or when the craft is right on it. Leva's Lake folder
tunes the cooldown, the sonar, the resting light, the feel, the found range and the sound, and Save Config writes
them to `LAKE_DIVE_CONFIG`. Reduced motion drops the camera's lag and lean and makes pings
instant. Completion is remembered in the browser (`sqyc:lake`): the lake then offers the dive again and a Read the
letter control that opens the letter without diving.

## About

The About drawer opens on the right, wider than Blog/Projects; its camera frames the ridges on
the left. Like Art, About clears the glyph rain and scene links; the HTML hero returns only once
the camera has settled back home. About swaps the glowing homepage contours for a quieter map
set (evenly spaced, thin, no pulse) built by the terrain worker at idle after the intro, or on first visit. Its lines keep a
minimum on-screen width; away from the route they darken, more so on unlit ground. The ground and
its lines fall to the background with plan distance from the plane's centre (`edgeFade`), so no camera
or flight sees the plane's edge. The route, its markers and the travelled path take one signal colour
(Leva: Trail colour, default cyan).

The drawer's experience timeline (`components/home/drawer/about/`) lists entries oldest first
by start month and ends at an open "Next?" stop before Connect. Its scroll reading head drives the
scene two ways: continuously, through a shared ref, `AboutPath` draws its zig-zag ridge route up
to the head (solid and blooming; the trail ahead is dashed); and once the head rests on a stop,
`SceneShell` passes that stop on and `CameraRig` frames its checkpoint (a partial shift toward a
set screen point plus a slight zoom, no turn; `lib/scene/aboutPath.ts`). `AboutCallouts` lays
out, in one HTML layer in screen space, each checkpoint's diamond marker, leader line and title,
plus altitude figures on the map lines beside the route. Clicking a title or marker scrolls the
drawer to that entry; the top of the drawer is the overview. SQYC closes the section back to the
landscape. The route, checkpoints and map live in `config/scene/aboutPath.ts` (checkpoints and
framing in Leva's About Path folder, shown only on About; its Edit route mode drags the route's
anchors over the terrain, adds or removes them, slides checkpoints along the route and saves both). The
path rests on the rendered surface (`sampleSurfaceHeight`) plus a tuned lift, not the text sampler's clearance.
A journey between About and Places runs the Places morph (below) under the open map: the map lines, the route
(`aboutPath.vert`) and the callouts (`rideOntoPlanet`, the same wrap on the CPU) ride onto the planet with the
terrain and dissolve with the home lines (`rideDissolve`), so nothing stands flat over a curling landscape.
Phones fold this vertically: the drawer starts at 40% of the height, the path's window above fading into it. Phones
have their own About pose (`mobileAbout*` in `config/scene/camera.ts`, the whole route in that window) and frame
each checkpoint from it toward a point in the window (`phoneFocus*`, Leva About Path); the reading head sits near
the column's top, only the active checkpoint keeps its title, and the altitude figures and the large About heading
go. Seen from that further-back camera, the map would dim and fog out, so phones draw the contours wider and
brighter (`AboutMap`), push the fog out while About is open (`SceneFog`, `phoneFogScale`), and give the tube more
width, the trail ahead more light and longer dashes. Leva's About Path › Edit camera hands the pointer to the orbit
camera (pivoting on the route, turning slowly) so Save Camera can store the About pose, the phone one at phone
widths; `CameraRig` frames checkpoints from the About pose as it stands (`AboutFraming`, published by `AboutPath`),
so they follow a composed view before it is saved. The route editor stays desktop-only.

About is a route, `/about`, in the same `(scene)` layout as Home and Art: the ABOUT scene link pushes it,
closing (×, Escape, SQYC) returns to `/`, and Back/Forward follow. The settled entry is kept in the URL as
`?entry=<id>`, replaced in place so scrolling adds no history; only the URL the page loaded with is applied
(`AboutEntrySync`), so returning to About in the app always starts at the top of the drawer.

## Places

Places routes are `/places` (globe overview) and `/places/[location]` (selected location), with `?gallery=&photo=`
opening the photo viewer (a full-page sliding row after Art's carousel, `lib/places/photoTrack.ts`); both live in the `(scene)` layout like Art, and `PlacesSection` (mounted by the places
layout) derives its view from the URL. Locations are `data/places.ts`: real places, oldest first, each with an
introduction and optionally recorded tracks (`segments`), stops (named markers), titled galleries (originals in the
git-ignored `photos-src/<location>/<gallery>/`, converted by `npm run import:places-photos` to metadata-free WebP and
thumbnails under `public/places/photos/<location>/<gallery>/`, whose `photos.json` gives every photo a date, location
and optional description, read by `npm run sync:places-photos`) and stories; a city visit has no mode and shows no dates of its own. The globe
(`components/scene/places/`) hangs above the terrain's centre (`PLACES_CONFIG`), drawn as a night globe in the
terrain's language: `globe.frag` reads the baked elevation map (`public/places/elevation.png`, NASA topography
resized by `scripts/assets/build-places-geo.mjs`) for a small relief and a faint land tint
(`shaders/terrain/landShading.glsl`, registered by `lib/scene/landShading.ts`; its hillshade is off) under a gold
rim; land carries a field of gold light points sampled from the same map in a worker (`lib/scene/places.worker.ts`, which
also decodes the map and builds its summary off the main thread), denser in lowlands (`PlacesLights`,
`shaders/terrain/placesPoints.*`); a faint gold graticule and baked coastlines and lakes (`public/places/coast.bin`,
Natural Earth 110m) as line segments; trail tubes along each location's tracks riding the relief (one line across
gaps between recordings, thinner with a location open, the other locations' leaving with their markers) and HTML markers without titles (a location with tracks has none: its path is its mark) (`PlacesCallouts`): locations
within `clusterWithin` degrees (chained; `phoneClusterWithin` on phones, whose globe is smaller) share a stacked marker that fans out on a click and holds the globe
still; a location may draw its own icon in place of the diamond (`LocationIcon`, more detail in focus and open); and an
open location's stops are small diamonds, each named beside it where there is room (the hovered one always), fading in only as the camera settles on the location
(`stopsFrom`) and out as it leaves, laid out like About's. A small location opens zoomed
(`lib/scene/placesLens.ts`, `shaders/terrain/placesLens.glsl`): the globe keeps its size while its surface (ground,
lines, lights, trails and markers) flows away from the location by a conformal zoom of the sphere, so shapes stay true
everywhere and the scale falls off smoothly with no edge; each location's zoom comes from the spread of its places
(`lens*` in `PLACES_LOCATION_CONFIG`), swells with the location's raised look, and the globe turns the zoom's centre rather
than the location's place to the marker point. Every location has its own sharper, 16-bit ground
(`public/places/ground/<id>.webp`, baked by `build-places-geo.mjs ground`, loaded by `useLocationGround` on first
open), which `globe.frag` reads under the zoom at the detail a screen pixel covers, fading into the global map far
out; the coastlines give way to it there. About the resting globe,
outside its turn, two tilted orbit rings with tick marks turn slowly (`PlacesRings`) and a sparse sky of stars
stands far behind (`PlacesStars`, the same point shader); lights, rings and stars join the isolated bloom. The camera parks at the Places
pose and the globe turns (`lib/scene/places.ts`): a drag follows the pointer; a release coasts under friction
and, below the snap speed, the nearest location within the capture angle pulls the globe in; untouched, it drifts
slowly. Apart from that capture, the location nearest the globe's centre as it stands (within `focusWithin`, any point of
its route or stops counting) is in focus: its marker, or its cluster's, locks on. A
selected location is pinned: while `CameraRig` journeys to the quarter-sphere framing `PlacesGlobe` publishes,
the globe holds for the first `turnFrom` of the way, then turns the location to an offset from its centre, most of the turn
done by the time the camera lands and the last of it a slight settle over `turnSettle` seconds more; the return to the
overview plays the same way toward the globe's centre. A location opening, the rings and the other markers
leave at once; back to all locations they return only at `revealAt` of the return turn, as the globe settles. The HTML
follows: the old view fades out, then the location panel rises as the camera lands and the index as the globe settles
(`PlacesSection`, `Places.css`). Lines and trails join the isolated bloom.

Entry is one zoom-out in which the globe is the planet the landscape lies on. `CameraRig` raises a Places morph
(0 to 1) over the 2 s journey. The landscape stands for `landscapeKm` of real ground, which sizes an Earth-scale
planet (`lib/scene/places.ts` `planetScale`); `PlacesGlobe` places it for the frame, tangent under the overview
camera's point of regard at the start and shrinking geometrically to the globe at the Places pose, its turn
easing from lying flat to its own, the anchor gliding along a screen-space path so the zoom never leaves the
frame; heights are above sea level, the landing place's elevation coming from the baked regional tile. It
publishes the patch frame (centre, radius, anchor and tangent axes, pivot, arc scale, height factor and datum)
through `CameraFrameState`. In the terrain cache, `terrain.vert` wraps every terrain vertex onto that sphere
about the pivot and, across the edge fade, takes the heights of a baked tile of 600 km of real ground around the
landing place (Terrarium tiles baked by `scripts/assets/build-places-geo.mjs region`), which the globe reads for
its own surface there (`globe.vert`/`.frag`, ever more coarsely toward the tile's edge, `regionSpread`, so it
softens into the global map); the home contour lines ride a little way and dissolve (`contours.vert`,
`placesRide`), and the terrain's pool of light gives way to the globe's dark ground (`terrain.frag`). The
terrain cache keeps the edge fade as alpha (the terrain is stored unblended; `terrainComposite.frag` lays it
over the background) and `globe.frag` composites it over its own ground where the terrain is translucent, so the
landscape's rim, which stands a little off the planet's coarse surface, fades into the ground from any camera
rather than ending in an edge; the globe fogs by each fragment's own depth for the same reason. The terrain's
relief is real on the way and takes the map's exaggeration as it arrives (`reliefIn`). `SceneFog` thins the haze
with altitude (`hazeOut`, `hazeFactor`); the lights come on at half strength over the dark ground as the landscape recedes
(`lightsIn`) and reach full with the lines, the stars arrive with altitude (`starsIn`), and the rim, graticule,
coastlines, rings and trails come in late (`linesIn`, `trailsIn`).
The terrain cache redraws while the morph runs; the globe and lights discard fragments behind the terrain's
depth (trails and markers hide only behind the globe's body, never terrain), and the tile writes none, so nothing reads as two objects. Leaving Places plays it backwards; the globe
is never faded as a whole. The globe mounts quietly after the intro so its maps are loaded before the first
journey. Places clears the scene text like About. The location index
(overview) and location panel share state with the scene through `PlacesSceneContext`, which `PlacesGlobe` and `CameraRig`
read inside the canvas (R3F bridges the contexts above it), so a selection or hover re-renders only them; arrows step through
locations, Escape returns to the overview. The index lists locations west to east under a meridian strip, a small world map
(locations as diamonds) whose shaded facing half and crosshair follow the place the globe faces (written each frame by `PlacesGlobe` to a ref in the
context); locations on the far side dim. The two views are two camera poses (`getCameraPose('places')` and
`getPlacesLocationPose`); the selection is read from the URL by the context itself, so the scene's first
frame already holds the route's view: a refresh on a location opens at its framing with the globe turned to it.
Phones have their own poses: the whole globe and its rings above a cardless peek sheet (the location in focus, or the
last one, and a bar that pulls the list up; a sideways swipe on the peek steps west to east or back and asks the globe,
through the context's `turnRequest`, to turn that location to its centre, holding the focus through the turn); the list pulled up (`indexOpen` in the context) steps the camera back
to a third pose, `getPlacesIndexPose` (a quick `placesIndex` journey, no turn); a location frames the globe close at the
top with the location centred in the view above its sheet (`phoneMarkerOffset`). The location nearest the globe's centre (within `titleWithin`, wider than
the focus) shows its title beside its marker as a hover would; on phones it is the only location title. Phones hide the
meridian strip and the index heading, keep the stops' names above the sheet with smaller stop markers, and draw the land lights smaller
(`phoneLightScale`).
`config/scene/places.ts` holds three groups that never stand in for each other: `PLACES_CONFIG` (the globe as
both views draw it, and the zoom-out), `PLACES_OVERVIEW_CONFIG` (all locations: ground, rings, feel by hand) and
`PLACES_LOCATION_CONFIG` (a location: framing, its own servo hold rate, the globe's turn and the raised-relief ground,
whose summary blur rebuilds live); the globe eases between the overview's and the location's values over the focus
journey. Leva shows the matching Places, Places Overview (overview only) and Places Location (location open only) folders,
each saving to its group (the dev-config writer scopes keys to an exported object). The Places folder's
Edit camera toggle hands the pointer to the dev orbit camera so Save Camera can store the Places poses (on phones
all locations, the list pulled up or a location, with its marker offset).

## Art

Art routes are `/artworks` (selected), `/artworks/all` (collection), and
`/artworks/[id]` (statically generated inspection). `ArtSection` is mounted once
by the artworks layout and derives its view from the URL (`useArtRoute`). Query
parameters preserve `selected`, `medium`, and inspection source `view`. Every view
captions works with `WallLabel` (title, material · size, note), a museum-style label.
All works (`Collection`) uses CSS-only justified rows: each work carries its
aspect ratio as an inline `--ratio`, and labels sit below each work. Hover devices
reveal each note over its work; touch tablets show it below the label. Phones show
the works alone (one per row; label kept for screen readers), leaving title, medium
and note to inspection. Medium sections scroll continuously under left-aligned headers
with counts. A fixed bottom bar (`MediumNav`) jumps between sections and highlights
the current medium. Scrolling between medium sections switches the backdrop through
the same wipe as featured selection; an inspected artwork takes precedence. The
`medium` query parameter scrolls to a section on collection entry. Carousel
selection replaces the current history entry; collection/detail navigation adds
entries. Inspection uses a native dialog, restoring focus and scroll on return;
direct details return to All works. Query synchronization (`QuerySync`) has its own
small Suspense boundary so the collection and detail HTML remain visible without JavaScript.

The desktop carousel is horizontal; narrow/touch layouts are vertical.
Works hang on a shared bottom line; a fixed-height wall label spans the widest
selected work's edges, so it never moves between works; the outgoing label fades
in place, outside the aria-live region. View links (`ScopeLink`) share their title
rows: "All works →" ends Selected's label title row; All works' visible heading
pairs with "← Selected works". The SQYC wordmark is the only way Home. Neighbours
recede (`config/art/carousel.ts`, plus CSS depth in `Carousel.css`). Desktop browses
by wheel, drag and keys; touch layouts add a hairline swipe rail with previous/next
buttons. On portrait phones the stage is capped at half the screen height and the
caption takes the rest. View links and the All works heading are small caps, like the nav.
Art's Screenshot mode is development-only.

`useGalleryTransition` snapshots visible artwork poses before collection
navigation (Back/Forward via the Navigation API's traverse event, `popstate` as
fallback). Works fall from their poses onto one orthographic "table" holding the
collection's arrangement, then the table rises rigidly into the grid; the return
runs the same path backwards. Keyframes are sampled `matrix3d` values; text only
fades. The carousel edge mask clears on the table and returns on arrival.
It skips animation for reduced motion and releases snapshots on input or resize.

## Backdrops

`CachedTerrain` caches the original terrain and retains its depth for scene text.
Digital uses `shaders/terrain/terrainComposite.frag`: cached lighting maps
to dots in the CSS accent gold. Dot size carries brightness across the full terrain.
Oil and pencil use full-width paintings including the rear ranges and foreground
slopes. A shared responsive CSS scrim in `components/art/ArtSection.css` darkens
the terrain behind the gallery and caption across all three backdrops. Both paintings
project onto the fixed authoring camera in `config/art/backdrop.ts` (which also holds
their image paths); viewport changes crop through the live camera projection.
`CachedTerrain` composites all three through one descending elevation-contour wipe,
reconstructing the terrain's world height from cached depth; open sky blends separately.
The same mask replaces the outgoing backdrop with the incoming one, preserving
both through the wipe. A wipe under way never swaps a visible side: a selection of the outgoing backdrop runs
the front back up in place, and one of a third backdrop resolves the wipe the short way within
`catchUpSeconds` before its own starts, so the latest selection follows within that time rather than after the
whole wipe (`lib/art/backdropWipe.ts`). Reduced motion skips backdrop animations.

Pointer movement over Art drives full-screen cursor treatments (`useArtCursor`,
tuned in `config/art/cursor.ts`; Leva's Art Cursor folder tunes and saves
light radius, heal times and strengths). Oil keeps a screen-space smudge
(`lib/art/cursorSmudge.ts`): the brush drags the painting along the stroke
as pure distortion, without mixing colours; the offsets settle back, including
through a backdrop change. Pencil and Digital share one coarse trail of light
(`lib/art/cursorTouch.ts`) that wakes with movement and dims at rest;
`terrainComposite.frag` answers it per backdrop. Pencil cross-hatches slopes with
evenly spaced elevation contours and open sky with a diagonal hatch. Digital
swells dots by how squarely the surface faces the viewer and fills open sky with
small dots. The carousel and collection keep the treatments faint, artworks and
inspection pause them, and reduced motion and Screenshot mode disable them.
`useBackdropImage` loads and uploads both paintings on Art entry, while the
camera is arriving, and retains them. Pending or failed loads leave the previous
backdrop visible. Changing the Art pose requires new images.
All backdrops share the Art camera pose, independent of material transitions.

## Camera and scene

In development, Leva's Art Camera folder enables orbit/pan/zoom and numeric
position/target editing. Save Art View persists that shared pose to
`config/scene/camera.ts`; Reset restores the last saved view. Reduced motion
settles section transitions immediately.
A camera journey is one motion straight from the pose the camera holds to the one asked for, planned by
`lib/scene/cameraJourney.ts`, which names its kind (Places's morph, the globe's focus turn, Art's flight,
About's) and so its time: every kind's duration lives in `CAMERA_JOURNEY_CONFIG` (`config/scene/camera.ts`; Leva's
Camera Journeys, Art's in Art Transition), and the effects riding a journey run over it. The rules:

- One zoom or one shrink, never a stop on the way. A location leaves straight to Art or Home in the one shrink of
  the planet; Art, About or the overview enters Places, or a location, in the one zoom-out. The overview is just
  another camera angle, not a waypoint.
- The effects go by the journey's two ends and run over its whole length: the Places morph whenever one end
  is Places, the Art flight fog whenever one end is Art, the globe's focus progress between Places's overview
  and a location. A journey from Art to Places does both at once.
- A new destination mid-journey sets off from where the camera is, the effects continuing from their live
  values; the last frame lands exactly on their end values. Every journey carries the morph (and a fog left by a
  flight out of Art) to its destination's resting value, so a journey between Places's own poses that begins
  mid-zoom (a location opened by the arrows while the globe is still forming, a return to Places cut short of its
  route change) finishes the zoom rather than freezing it until it snaps on arrival.
- The globe keeps the location it was showing while it shrinks away (the route, and so the selection, changes
  mid-way), so leaving a location is one shrink from that framing rather than a swing back to the overview first.
  On the ride the globe's own turn holds still: its servo would chase the marker offset against a camera that
  moves every frame, and the turn is composed in the view of the lens the globe rests under (yaw about the axis,
  pitch about that camera's right), not the moving camera's, or it would turn with the camera. Arriving at a
  location from outside Places, the own turn is set once at the start of the ride to where the arriving camera will
  see the location, hidden under the flat planet until the globe forms, so no correction follows on arrival. A
  destination changed on the way in (the nav's Places clicked mid-way out of a location, so the camera lands at
  the overview rather than the location's framing the ride set off for; a location opened while the globe is
  still forming) would move that lens, the ride's end and the own turn in one frame, now or on arrival: instead
  the lens glides from the one the ride was bound for to the new one over the rest of the way, and the own turn
  with it to the new framing (a location at its marker point; over all locations, the location held at the
  centre). The globe publishes its outline for the location panel only once it has arrived, so the panel is not reflowed around
  an Earth-sized shape every frame of the ride.
- The camera is never inside the planet, and nothing pushes it off its path. The planet is placed about the
  camera: the landing point's direction eases, in the live camera's own frame, from where the landscape stands to
  where the anchor rests, and its distance along that ray is whatever stands the camera a set height above the
  planet's surface (`rideDistance`), that height falling geometrically from the camera's height over the flat
  Earth-sized planet to its height over the resting globe. Placed the other way round (the landing point at an
  interpolated distance), the planet, growing about the landing place while tilting into its own turn, would
  sweep past a camera framing a location near its limb. Directions, not screen positions: the landscape falls behind
  a camera that has turned up to the globe, where projection folds over and a screen glide swings wild.
- The glide starts from the live camera's view of the landing point, not the overview's, so a journey from any
  pose begins exactly where the landscape stands and never pans to meet it.

Leaving Art or Places by the nav, `SceneShell` cancels the link, fades the section's content out
(`data-leaving`) while the camera sets off, and pushes the route once it is invisible; Back/Forward keep the
instant swap. The canvas is sized to the viewport width (`w-screen`), not its container, so a scrollbar coming
or going with the route (All works scrolls, Places does not) cannot resize it mid-journey: a resized WebGL
canvas is blank for a frame. Journeys interpolate position and orientation independently with eased
departure/arrival; the focus follows the rotation so large turns cannot cross
the camera. The rig applies its pose after development orbit controls, which are off on About, where
the pose and each checkpoint's framing are authored and the route editor takes the pointer.
The Art pose sits near the terrain boundary, so journeys to and from Art blend
`SceneFog` toward denser flight fog (`FOG_CONFIG.flightNear/flightFar`); arrival
holds it until the first backdrop wipe completes, then eases it out. Leva's Art
Transition folder tunes journey/wipe durations and flight fog live
(`lib/art/transitionSettings.ts`) and saves them to config. Journeys into and out of About, and between its
entries, take their own times (Leva About Path: Journey, Focus; `config/scene/aboutPath.ts`).
Artworks are ordinary HTML images.

To save GPU time, layers that are fully faded out skip their offscreen work: glyph rain while hidden, bloom while no
contour or scene link is drawn. On every route, `StillFrameGate` skips frames identical to the last drawn one
(`lib/scene/stillFrames.ts`), so a still gallery, About between checkpoints or a location at rest leaves the GPU idle
(Home always draws: its contours pulse and the rain falls). The glyph rain's offscreen passes step at their own
rate (`GLYPH_RAIN_CONFIG.compositor.stepsPerSecond`), every other frame at 60 Hz. The canvas is opaque
(`alpha: false`), so the compositor blits it rather than blending it over the page. Layers that mount hidden (the
Places globe, the About map) get their shaders compiled while the scene is quiet (`PrecompileHidden`), and Art's
backdrop paintings are decoded off the main thread and uploaded at idle after the intro, so no journey links a
program or uploads a texture mid-flight.

Art's Screenshot mode uses `CapturePanel` and the shared Art scene context.
It hides the gallery/scrim/navigation, frames the terrain at 2:1, and applies
temporary exposure/contrast/saturation in the terrain compositor. `CaptureExport`
reads the completed composer frame to PNG at 2048 or 4096 pixels wide without
retaining the drawing buffer; it restores device pixel ratio on exit. Settings
export records the live camera and adjustments. One consolidated prompt per
backdrop lives in `public/art-prompts/`, alongside a brief capture guide.
`/projects` and `/blog` are drawer routes in the `(scene)` layout, like `/about`: the nav and scene links open the
drawer, whose "View all" link leads to the archive at `/projects/all` or `/blog/all` (as Selected works leads to All works).
Project cards link directly to repositories.

Review backdrops in the actual `/artworks` scene so camera, fog,
compositing, and artwork overlays match the website.

## Content and styles

Articles use `content/<lowercase-hyphenated-slug>/index.mdx` with an exported
`article` record defined by `lib/content/types.ts`. The server adapter discovers
articles and generates `/blog/[slug]`; `_placeholder` is unpublished. Syntax
highlighting runs at build time.

Terrain is baked offline, worker-loaded, and attached in stages. See the
[terrain runbook](terrain-baking.md) for inputs and artifacts.
Krypton is local; article classes use a separate system serif stack.
Content pages scroll; full-screen overflow belongs to the homepage.

Styles: Tailwind classes for most components (long lists in `Component.styles.ts`),
hand-written CSS beside its component (`Component.css`). Global partials load
through `styles/globals.css`; Art ones are imported by `app/(scene)/artworks/layout.tsx`. Both
lists are the cascade order. Tokens live in `styles/tokens.css`; translucent colours
are named at the top of the stylesheet that uses them.

## Commands and deployment

| Command | Purpose |
| --- | --- |
| `npm ci` / `npm run dev` | Install / develop |
| `npm run build` | Validate terrain bake, compile, type-check, generate routes |
| `npm run lint` | ESLint |
| `npm run bake:terrain` / `npm run check:terrain-bake` | Generate / validate terrain artifacts |
| `npm run bake:oil` | Legacy: rebuild oil pigment and relief maps (unused by the live site) |
| `npm run sync:artwork-dimensions` | Update artwork dimensions |
| `node scripts/test/<file>.mjs` | Unit checks: About path, Places globe, dev config writer, backdrop wipe, camera transition, carousel layout, text transition, reach field |
| `node scripts/assets/build-places-geo.mjs coast <geojson>` / `track <id> <gpx…>` | Bake coastlines to `public/places/coast.bin`; simplify GPX recordings to track JSON |
| `node scripts/verify/verify-art.mjs` | Opt-in browser journey checks and screenshots; requires externally available Playwright |
| `node scripts/verify/verify-pencil-overlay.mjs` | Opt-in backdrop wipe, image resize, and reduced-motion checks |
| `node scripts/verify/verify-text-transitions.mjs` | Opt-in desktop/mobile text transition and navigation regression checks |
| `node scripts/assets/capture-pencil-source.mjs` | Capture the unstyled Art view for backdrop image generation |
| `node scripts/assets/register-illustration.mjs oil --apply` | Measure (and with `--apply`, correct) a generated oil or pencil image's drift from the terrain capture |

For Art verification, set `ART_BASE_URL` to a running server, `ARTIFACT_DIR` to
the output directory, and `PLAYWRIGHT_MODULE` if Playwright is outside normal
module resolution. `CHROME_PATH` optionally selects a browser executable.

`.github/workflows/nextjs.yml` enables `GITHUB_PAGES=true`, omits the dev API
route, and exports to `out/`. That mode disables Next image optimization.
The postbuild script supplies dotted prefetch filenames for a Next 16.3 Windows
export path bug; it is a no-op for server builds and Linux deployment builds.
`NEXT_PUBLIC_BASE_PATH` configures the base path; `NEXT_PUBLIC_SITE_URL`
configures metadata's origin. Next server cache headers do not apply to Pages.

Verification behavior lives in [workflow](workflow.md); known gaps live in
`todos/`. Neither needs to be duplicated here.
