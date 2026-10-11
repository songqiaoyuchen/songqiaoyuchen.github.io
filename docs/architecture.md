# Architecture

Current implementation map, not a fixed design direction. Update when structure changes.
Each source folder has a `README.md` listing its files; this page explains how they fit together.

## Stack and layout

Next.js App Router, React, TypeScript, Tailwind; React Three Fiber/Three.js,
Drei, post-processing, and GLSL for terrain. Motion supports interactions.

| Location | Responsibility |
| --- | --- |
| `app/` | Routes, layout, metadata, development API |
| `components/shell/` | Persistent Home/About/Art/Travel shell: one scene, loading state, fallback, article summaries |
| `components/home/` | Homepage hero, preloader and preview drawer (About, Blog, Projects panels) |
| `components/art/` | Art section: carousel, collection, inspection, gallery transition, Screenshot mode |
| `components/travel/` | Travel section: trip index, trip panel, photo viewer, shared scene state |
| `components/scene/`, `shaders/` | WebGL: camera, terrain, backdrops, scene text, effects, Leva controls |
| `components/site/`, `components/projects/`, `components/blog/` | Nav, project cards, editorial UI |
| `config/` | Tunable numbers (scene, art, hero, preloader, breakpoints) |
| `data/` | Copy and content: sections, hero, About, projects, blog drawer, artworks |
| `styles/` | Global CSS entry, design tokens, base and shared utilities |
| `lib/` | Framework-free logic: terrain pipeline, text geometry, art and scene maths, MDX loading |
| `content/`, `mdx-components.tsx` | MDX articles and their registered components |
| `public/`, `scripts/` | Fonts, media, baked assets; bake, asset, test and verify tools |

Names used throughout: **scene links** are the WebGL ART / PROJECTS / BLOG / ABOUT / TRAVEL words that open
sections; **glyph rain** is the faint falling letter columns behind them; a **backdrop** is the terrain
re-rendered as oil, pencil or digital behind the Art gallery, swapped by a **backdrop wipe**.

## Home

The homepage is a single viewport with a preloader, WebGL scene, and preview
drawers. Home and Art share a persistent route-group layout (`(scene)`, mounting `SceneShell`); direct
Art entry exposes content while the terrain prepares, and a warm return Home retains
the canvas. Other sections retain their existing lifecycles.
Scene text dissolves into pixels on section changes. Scene link layouts change only
while fully hidden; scene links and the hero name reveal after camera arrival.
Art hides all scene text from navigation start, independently of backdrop loading.

## About

The About drawer opens on the right, wider than Blog/Projects; its camera frames the ridges on
the left. Like Art, About clears the glyph rain and scene links; the HTML hero returns only once
the camera has settled back home. About swaps the glowing homepage contours for a quieter map
set (evenly spaced, thin, no pulse) built by the terrain worker on first visit. Its lines keep a
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
Phones keep the full-width drawer without the path.

About is a route, `/about`, in the same `(scene)` layout as Home and Art: the ABOUT scene link pushes it,
closing (×, Escape, SQYC) returns to `/`, and Back/Forward follow. The settled entry is kept in the URL as
`?entry=<id>`, replaced in place so scrolling adds no history; only the URL the page loaded with is applied
(`AboutEntrySync`), so returning to About in the app always starts at the top of the drawer.

## Travel

Travel routes are `/travel` (globe overview) and `/travel/[trip]` (selected trip), with `?photo=` opening
the photo viewer; both live in the `(scene)` layout like Art, and `TravelSection` (mounted by the travel
layout) derives its view from the URL. Trips are `data/travel.ts`: real places, oldest first, each with an
introduction and optionally recorded tracks (`segments`), photos and a Blog article slug. The globe
(`components/scene/travel/`) hangs above the terrain's centre (`TRAVEL_CONFIG`), drawn as a night globe in the
terrain's language: `globe.frag` reads the baked elevation map (`public/travel/elevation.png`, NASA topography
resized by `scripts/assets/build-travel-geo.mjs`) for a small relief and a faint land tint
(`shaders/terrain/landShading.glsl`, registered by `lib/scene/landShading.ts`; its hillshade is off) under a gold
rim; land carries a field of gold light points sampled from the same map, denser in lowlands (`TravelLights`,
`shaders/terrain/travelPoints.*`); a faint gold graticule and baked coastlines and lakes (`public/travel/coast.bin`,
Natural Earth 110m) as line segments; trail tubes along each trip's tracks riding the relief (gaps between
recordings dotted) and HTML markers with titles (`TravelCallouts`, laid out like About's). About the resting globe,
outside its turn, two tilted orbit rings with tick marks turn slowly (`TravelRings`) and a sparse sky of stars
stands far behind (`TravelStars`, the same point shader); lights, rings and stars join the isolated bloom. The camera parks at the Travel
pose and the globe turns (`lib/scene/travel.ts`): a drag follows the pointer; a release coasts under friction
and, below the snap speed, the nearest trip within the capture angle pulls the globe in; untouched, it drifts
slowly. A selected trip is pinned: while `CameraRig` journeys to the quarter-sphere framing `TravelGlobe` publishes,
the globe holds for the first `turnFrom` of the way, then turns the trip to an offset from its centre, most of the turn
done by the time the camera lands and the last of it a slight settle over `turnSettle` seconds more; the return to the
overview plays the same way toward the globe's centre. Lines and trails join the isolated bloom.

Entry is one zoom-out in which the globe is the planet the landscape lies on. `CameraRig` raises a Travel morph
(0 to 1) over the 2 s journey. The landscape stands for `landscapeKm` of real ground, which sizes an Earth-scale
planet (`lib/scene/travel.ts` `planetScale`); `TravelGlobe` places it for the frame, tangent under the overview
camera's point of regard at the start and shrinking geometrically to the globe at the Travel pose, its turn
easing from lying flat to its own, the anchor gliding along a screen-space path so the zoom never leaves the
frame; heights are above sea level, the landing place's elevation coming from the baked regional tile. It
publishes the patch frame (centre, radius, anchor and tangent axes, pivot, arc scale, height factor and datum)
through `CameraFrameState`. In the terrain cache, `terrain.vert` wraps every terrain vertex onto that sphere
about the pivot and, across the edge fade, takes the heights of a baked tile of 600 km of real ground around the
landing place (Terrarium tiles baked by `scripts/assets/build-travel-geo.mjs region`), which the globe reads for
its own surface there (`globe.vert`/`.frag`, ever more coarsely toward the tile's edge, `regionSpread`, so it
softens into the global map); the home contour lines ride a little way and dissolve (`contours.vert`,
`travelRide`), and the terrain's pool of light gives way to the globe's dark ground (`terrain.frag`). The
terrain cache keeps the edge fade as alpha (the terrain is stored unblended; `terrainComposite.frag` lays it
over the background) and `globe.frag` composites it over its own ground where the terrain is translucent, so the
landscape's rim, which stands a little off the planet's coarse surface, fades into the ground from any camera
rather than ending in an edge; the globe fogs by each fragment's own depth for the same reason. The terrain's
relief is real on the way and takes the map's exaggeration as it arrives (`reliefIn`). `SceneFog` thins the haze
with altitude (`hazeOut`, `hazeFactor`); the lights come on at half strength over the dark ground as the landscape recedes
(`lightsIn`) and reach full with the lines, the stars arrive with altitude (`starsIn`), and the rim, graticule,
coastlines, rings and trails come in late (`linesIn`, `trailsIn`).
The terrain cache redraws while the morph runs; the globe and trails discard fragments behind the terrain's
depth, and the tile writes none, so nothing reads as two objects. Leaving Travel plays it backwards; the globe
is never faded as a whole. The globe mounts quietly after the intro so its maps are loaded before the first
journey. Travel clears the scene text like About. The trip index
(overview) and trip panel share state with the scene through `TravelSceneContext`, which `TravelGlobe` and `CameraRig`
read inside the canvas (R3F bridges the contexts above it), so a selection or hover re-renders only them; arrows step through
trips, Escape returns to the overview. Phones use their own Travel pose with the content in a sheet.
`config/scene/travel.ts` holds three groups that never stand in for each other: `TRAVEL_CONFIG` (the globe as
both views draw it, and the zoom-out), `TRAVEL_OVERVIEW_CONFIG` (all trips: ground, rings, feel by hand) and
`TRAVEL_TRIP_CONFIG` (a trip: framing, its own servo hold rate, the focus journey and the raised-relief ground,
whose summary blur rebuilds live); the globe eases between the overview's and the trip's values over the focus
journey. Leva shows the matching Travel, Travel Overview (overview only) and Travel Trip (trip open only) folders,
each saving to its group (the dev-config writer scopes keys to an exported object). The Travel folder's
Edit camera toggle hands the pointer to the dev orbit camera so Save Camera can store the Travel (and phone
Travel) poses.

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
both through the wipe. Rapid selections leave the active wipe at its normal
speed, then start only the latest requested backdrop; intermediate requests are
discarded (`lib/art/backdropWipe.ts`). Reduced motion skips backdrop animations.

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
`lib/scene/cameraJourney.ts`, which names its kind (Travel's morph, the globe's focus turn, Art's flight,
About's) and so its time. The rules:

- One zoom or one shrink, never a stop on the way. A trip leaves straight to Art or Home in the one shrink of
  the planet; Art, About or the overview enters Travel, or a trip, in the one zoom-out. The overview is just
  another camera angle, not a waypoint.
- The effects go by the journey's two ends and run over its whole length: the Travel morph whenever one end
  is Travel, the Art flight fog whenever one end is Art, the globe's focus progress between Travel's overview
  and a trip. A journey from Art to Travel does both at once.
- A new destination mid-journey sets off from where the camera is, the effects continuing from their live
  values; the last frame lands exactly on their end values.
- The globe keeps the trip it was showing while it shrinks away (the route, and so the selection, changes
  mid-way), so leaving a trip is one shrink from that framing rather than a swing back to the overview first.
  On the ride the globe's own turn holds still: its servo would chase the marker offset against a camera that
  moves every frame, and the turn is composed in the view of the lens the globe rests under (yaw about the axis,
  pitch about that camera's right), not the moving camera's, or it would turn with the camera. Arriving at a
  trip from outside Travel, the own turn is set once at the start of the ride to where the arriving camera will
  see the trip, hidden under the flat planet until the globe forms, so no correction follows on arrival. The
  globe publishes its outline for the trip panel only once it has arrived, so the panel is not reflowed around
  an Earth-sized shape every frame of the ride.
- The camera is never inside the planet, and nothing pushes it off its path. The planet is placed about the
  camera: the landing point's direction eases, in the live camera's own frame, from where the landscape stands to
  where the anchor rests, and its distance along that ray is whatever stands the camera a set height above the
  planet's surface (`rideDistance`), that height falling geometrically from the camera's height over the flat
  Earth-sized planet to its height over the resting globe. Placed the other way round (the landing point at an
  interpolated distance), the planet, growing about the landing place while tilting into its own turn, would
  sweep past a camera framing a trip near its limb. Directions, not screen positions: the landscape falls behind
  a camera that has turned up to the globe, where projection folds over and a screen glide swings wild.
- The glide starts from the live camera's view of the landing point, not the overview's, so a journey from any
  pose begins exactly where the landscape stands and never pans to meet it.

Leaving Art or Travel by the nav, `SceneShell` cancels the link, fades the section's content out
(`data-leaving`) while the camera sets off, and pushes the route once it is invisible; Back/Forward keep the
instant swap. The canvas is sized to the viewport width (`w-screen`), not its container, so a scrollbar coming
or going with the route (All works scrolls, Travel does not) cannot resize it mid-journey: a resized WebGL
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
contour or scene link is drawn. On Art, `StillFrameGate` skips frames identical to the last drawn one
(`lib/scene/stillFrames.ts`), so a still gallery leaves the GPU idle.

Art's Screenshot mode uses `CapturePanel` and the shared Art scene context.
It hides the gallery/scrim/navigation, frames the terrain at 2:1, and applies
temporary exposure/contrast/saturation in the terrain compositor. `CaptureExport`
reads the completed composer frame to PNG at 2048 or 4096 pixels wide without
retaining the drawing buffer; it restores device pixel ratio on exit. Settings
export records the live camera and adjustments. One consolidated prompt per
backdrop lives in `public/art-prompts/`, alongside a brief capture guide.
Archives remain at `/projects` and `/blog`; About/contact lives in its drawer.
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
| `node scripts/test/<file>.mjs` | Unit checks: About path, Travel globe, dev config writer, backdrop wipe, camera transition, carousel layout, text transition |
| `node scripts/assets/build-travel-geo.mjs coast <geojson>` / `track <id> <gpx…>` | Bake coastlines to `public/travel/coast.bin`; simplify GPX recordings to track JSON |
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
