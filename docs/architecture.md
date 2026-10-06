# Architecture

Current implementation map, not a fixed design direction. Update when structure changes.
Each source folder has a `README.md` listing its files; this page explains how they fit together.

## Stack and layout

Next.js App Router, React, TypeScript, Tailwind; React Three Fiber/Three.js,
Drei, post-processing, and GLSL for terrain. Motion supports interactions.

| Location | Responsibility |
| --- | --- |
| `app/` | Routes, layout, metadata, development API |
| `components/shell/` | Persistent Home/Art shell: one scene, loading state, fallback, article summaries |
| `components/home/` | Homepage hero, preloader and preview drawer (About, Blog, Projects panels) |
| `components/art/` | Art section: carousel, collection, inspection, gallery transition, Screenshot mode |
| `components/scene/`, `shaders/` | WebGL: camera, terrain, backdrops, scene text, effects, Leva controls |
| `components/site/`, `components/projects/`, `components/blog/` | Nav, project cards, editorial UI |
| `config/` | Tunable numbers (scene, art, hero, preloader, breakpoints) |
| `data/` | Copy and content: sections, hero, About, projects, blog drawer, artworks |
| `styles/` | Global CSS entry, design tokens, base and shared utilities |
| `lib/` | Framework-free logic: terrain pipeline, text geometry, art and scene maths, MDX loading |
| `content/`, `mdx-components.tsx` | MDX articles and their registered components |
| `public/`, `scripts/` | Fonts, media, baked assets; bake, asset, test and verify tools |

Names used throughout: **scene links** are the WebGL ART / PROJECTS / BLOG / ABOUT words that open
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
Camera journeys interpolate position and orientation independently with eased
departure/arrival; the focus follows the rotation so large turns cannot cross
the camera. The rig applies its pose after development orbit controls.
The Art pose sits near the terrain boundary, so journeys to and from Art blend
`SceneFog` toward denser flight fog (`FOG_CONFIG.flightNear/flightFar`); arrival
holds it until the first backdrop wipe completes, then eases it out. Leva's Art
Transition folder tunes journey/wipe durations and flight fog live
(`lib/art/transitionSettings.ts`) and saves them to config.
Artworks are ordinary HTML images.

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
| `node scripts/test/<file>.mjs` | Unit checks: backdrop wipe, camera transition, carousel layout, text transition |
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
