# Architecture

Current implementation map, not a fixed design direction. Update when structure changes.

## Stack and ownership

Next.js App Router, React, TypeScript, Tailwind; React Three Fiber/Three.js,
Drei, post-processing, and GLSL for terrain. Motion and GSAP support interactions.

| Location | Responsibility |
| --- | --- |
| `app/` | Routes, layout, metadata, global styles, development API |
| `app/(experience)/layout.tsx` → `components/home/Home.tsx` | Persistent Home/Art terrain, article summaries, readiness, fallback and preview state |
| `components/home/drawer/` | Lazy About, project, and blog previews |
| `components/scene/`, `shaders/` | Terrain, effects, scene-mounted HTML stream controls |
| `components/artworks/` | Art carousel, collection medium navigation, route-backed inspection, terrain-medium context and section styles |
| `components/blog/` | Editorial UI |
| `data/` | Projects, artworks, About timeline/contact |
| `lib/content/`, `content/`, `mdx-components.tsx` | Server MDX loader, articles, registered components |
| `lib/terrain/`, `lib/text/` | Terrain worker/assets and glyph geometry |
| `lib/artworks/` | Art carousel layout interpolation |
| `config/`, `app/globals.css` | Tunable scene/layout values and shared style tokens |
| `public/`, `scripts/` | Local fonts/media/baked assets and generation utilities |

The homepage is a single viewport with a preloader, WebGL scene, and preview
drawers. Home and Art share a persistent route-group layout; direct Art entry
exposes content while the terrain prepares, and a warm return Home retains the
canvas. Other sections retain their existing lifecycles.
Scene text dissolves into pixels on section changes. Link layouts change only
while fully hidden; link streams and the hero name reveal after camera arrival.
Art hides all scene text from navigation start, independently of medium loading.

Art routes are `/artworks` (selected), `/artworks/all` (collection), and
`/artworks/[id]` (statically generated inspection). Query parameters preserve
`selected`, `medium`, and inspection source `view`. Every view captions works
with `ArtworkLabel` (title, material · size, note), a museum-style wall label.
All works (`ArtCollection`) uses CSS-only justified rows: each work carries its
aspect ratio as an inline `--ratio`, phones get one work per row, and labels sit
below each work. Hover devices reveal each note over its work; touch shows it
below the label. Medium sections scroll continuously under left-aligned headers
with counts. A fixed bottom bar jumps between sections and highlights the
current medium. Scrolling between
medium sections switches the terrain treatment through the same transition as
featured selection; an inspected artwork takes precedence. The `medium` query
parameter scrolls to a section on collection entry. Carousel selection replaces
the current history entry; collection/detail navigation adds entries. Inspection
uses a native dialog, restoring focus and scroll on return; direct details return
to All works. Query synchronization has its own small Suspense boundary so the
collection and detail HTML remain visible without JavaScript.

The desktop carousel is horizontal; narrow/touch layouts are vertical.
Works hang on a shared bottom line; a fixed-height wall label spans the widest
selected work's edges, so it never moves between works; the outgoing label fades
in place, outside the aria-live region. View links share their title rows: "All
works →" ends Selected's label title row; All works' visible heading pairs with
"← Selected works". The SQYC wordmark is the only way Home. Neighbours recede (`NEIGHBOR_SCALE`/`NEIGHBOR_OPACITY`
in `lib/artworks/carouselLayout.ts`, plus CSS depth). Desktop browses by wheel,
drag and keys; touch layouts add a hairline swipe rail with previous/next buttons.
Art's Screenshot mode is development-only.
`useGalleryTransition` snapshots visible artwork poses before collection
navigation (Back/Forward via the Navigation API's traverse event, `popstate` as
fallback). Works fall from their poses onto one orthographic "table" holding the
collection's arrangement, then the table rises rigidly into the grid; the return
runs the same path backwards. Keyframes are sampled `matrix3d` values; text only
fades. The carousel edge mask clears on the table and returns on arrival.
It skips animation for reduced motion and releases snapshots on input or resize.
`CachedTerrain` caches the original terrain and retains its depth for streams.
Digital uses `shaders/terrainComposite.frag`: cached lighting maps
to dots in the CSS accent gold. Dot size carries brightness across the full terrain.
Oil and pencil use full-width illustrations including the rear ranges and foreground
slopes. A shared responsive CSS scrim in `components/artworks/art.css` darkens
the terrain behind the gallery and caption across all three media. Both illustrations
project onto the fixed authoring camera in `config/scene/artIllustration.ts`;
viewport changes crop through the live camera projection. Image paths live in
their respective `oilIllustration.ts` / `pencilIllustration.ts` configs.
`CachedTerrain` composites all three through one descending elevation-contour wipe,
reconstructing the terrain's world height from cached depth; open sky blends separately.
The same mask replaces the outgoing style with the incoming style, preserving
both through the transition. Rapid selections leave the active wipe at its normal
speed, then start only the latest requested medium; intermediate requests are discarded.
Reduced motion skips medium animations.
Pointer movement over Art drives full-screen cursor treatments (`useArtCursor`,
tuned in `config/scene/artCursor.ts`; Leva's Art Cursor folder tunes and saves
light radius, heal times and strengths). Oil keeps a screen-space smudge
(`lib/scene/cursorSmudge.ts`): the brush drags the illustration along the stroke
as pure distortion, without mixing colours; the offsets settle back, including
through a medium change. Pencil and Digital share one coarse trail of light
(`lib/scene/cursorTouch.ts`) that wakes with movement and dims at rest;
`terrainComposite.frag` answers it per medium. Pencil cross-hatches slopes with
evenly spaced elevation contours and open sky with a diagonal hatch. Digital
swells dots by how squarely the surface faces the viewer and fills open sky with
small dots. The carousel and collection keep the treatments faint, artworks and
inspection pause them, and reduced motion and Screenshot mode disable them.
`useIllustrationTexture` loads and uploads both textures on Art entry, while the
camera is arriving, and retains them. Pending or failed loads leave the previous
treatment visible. Changing the Art pose requires new images.
The older oil bake and pencil surface shaders are no longer on the active path.
All media share the Art camera pose, independent of material transitions.
In development, Leva's Art Camera folder enables orbit/pan/zoom and numeric
position/target editing. Save Art View persists that shared pose to
`config/scene/camera.ts`; Reset restores the last saved view. Reduced motion
settles section transitions immediately.
Camera journeys interpolate position and orientation independently with eased
departure/arrival; the focus follows the rotation so large turns cannot cross
the camera. The rig applies its pose after development orbit controls.
The Art pose sits near the terrain boundary, so journeys to and from Art blend
`SceneFog` toward denser flight fog (`FOG_CONFIG.flightNear/flightFar`); arrival
holds it until the first medium wipe completes, then eases it out. Leva's Art
Transition folder tunes journey/wipe durations and flight fog live
(`lib/scene/artTransitionSettings.ts`) and saves them to config.
Artworks are ordinary HTML images.
Art's Screenshot mode uses `ArtCapturePanel` and the shared Art scene context.
It hides the gallery/scrim/navigation, frames the terrain at 2:1, and applies
temporary exposure/contrast/saturation in the terrain compositor. `ArtCaptureExport`
reads the completed composer frame to PNG at 2048 or 4096 pixels wide without
retaining the drawing buffer; it restores device pixel ratio on exit. Settings
export records the live camera and adjustments. One consolidated prompt per
medium lives in `public/art-prompts/`, alongside a brief capture guide.
Archives remain at `/projects` and `/blog`; About/contact lives in its drawer.
Project cards link directly to repositories.

Review terrain treatments in the actual `/artworks` scene so camera, fog,
compositing, and artwork overlays match the website.

Articles use `content/<lowercase-hyphenated-slug>/index.mdx` with an exported
`article` record defined by `lib/content/types.ts`. The server adapter discovers
articles and generates `/blog/[slug]`; `_placeholder` is unpublished. Syntax
highlighting runs at build time.

Terrain is baked offline, worker-loaded, and attached in stages. See the
[terrain runbook](terrain-baking.md) for inputs and artifacts.
Krypton is local; article classes use a separate system serif stack.
Content pages scroll; full-screen overflow belongs to the homepage.

## Commands and deployment

| Command | Purpose |
| --- | --- |
| `npm ci` / `npm run dev` | Install / develop |
| `npm run build` | Validate terrain bake, compile, type-check, generate routes |
| `npm run lint` | ESLint |
| `npm run bake:terrain` / `npm run check:terrain-bake` | Generate / validate terrain artifacts |
| `npm run bake:oil` | Rebuild oil pigment and relief maps from the approved diffuse crop |
| `npm run sync:artwork-dimensions` | Update artwork dimensions |
| `node scripts/verify-art.mjs` | Opt-in browser journey checks and screenshots; requires externally available Playwright |
| `node scripts/capture-pencil-source.mjs` | Capture the unstyled Art view for pencil image generation |
| `node scripts/register-illustration.mjs oil --apply` | Measure (and with `--apply`, correct) a generated oil or pencil image's drift from the terrain capture |
| `node scripts/verify-pencil-overlay.mjs` | Opt-in shared medium wipe, image resize, and reduced-motion checks |
| `node scripts/test-medium-transition.mjs` | Check transition continuity and rapid selection behavior |
| `node scripts/test-text-transition.mjs` | Check scene text visibility, retargeting and reduced motion |
| `node scripts/test-camera-transition.mjs` | Check camera rotation, arrival, retargeting and reduced motion |
| `node scripts/test-carousel-layout.mjs` | Check carousel settled poses, wrapping and continuous rotation |
| `node scripts/verify-text-transitions.mjs` | Opt-in desktop/mobile text transition and navigation regression checks |

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
