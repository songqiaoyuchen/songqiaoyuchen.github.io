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
| `components/artworks/` | Art carousel, collection filters, route-backed inspection, terrain-medium context and section styles |
| `components/blog/` | Editorial UI |
| `data/` | Projects, artworks, About timeline/contact |
| `lib/content/`, `content/`, `mdx-components.tsx` | Server MDX loader, articles, registered components |
| `lib/terrain/`, `lib/text/` | Terrain worker/assets and glyph geometry |
| `config/`, `app/globals.css` | Tunable scene/layout values and shared style tokens |
| `public/`, `scripts/` | Local fonts/media/baked assets and generation utilities |

The homepage is a single viewport with a preloader, WebGL scene, and preview
drawers. Home and Art share a persistent route-group layout; direct Art entry
exposes content while the terrain prepares, and a warm return Home retains the
canvas. Other sections retain their existing lifecycles.

Art routes are `/artworks` (selected), `/artworks/all` (collection), and
`/artworks/[id]` (statically generated inspection). Query parameters preserve
`selected`, `medium`, and inspection source `view`. Carousel selection replaces
the current history entry; collection/detail navigation adds entries. Inspection
uses a native dialog, restoring focus and scroll on return; direct details return
to All works. Query synchronization has its own small Suspense boundary so the
collection and detail HTML remain visible without JavaScript.

The desktop carousel is horizontal; narrow/touch layouts are vertical.
`CachedTerrain` caches the original terrain and retains its depth for streams.
Digital uses `shaders/terrainComposite.frag`: cached lighting maps
to dots in the CSS accent gold. Dot size carries brightness; complete dots stop
at staggered positions before the composition midpoint, keeping the right half
dark. Oil and pencil use generated images of the foreground left mountain
with deliberately unfinished marks and quiet upper/right negative space. Both
project onto the fixed authoring camera in `config/scene/artIllustration.ts`;
viewport changes crop through the live camera projection. Image paths live in
their respective `oilIllustration.ts` / `pencilIllustration.ts` configs.
`CachedTerrain` composites all three through one top-down irregular wipe;
the same mask replaces the outgoing style with the incoming style, preserving
both through the transition. Rapid selections finish the active wipe before
starting the latest requested medium. Reduced motion skips medium animations.
`useIllustrationTexture` loads textures on first entry and retains them; pending
or failed loads leave the previous treatment visible. Changing the Art pose requires new images.
The far-left secondary shoulder is omitted in both illustrations and in digital's
authoring-coordinate dot mask, retaining the main foreground slope.
The older oil bake and pencil surface shaders are no longer on the active path.
All media share the Art camera pose, independent of material transitions.
In development, Leva's Art Camera folder enables orbit/pan/zoom and numeric
position/target editing. Save Art View persists that shared pose to
`config/scene/camera.ts`; Reset restores the last saved view. Reduced motion
settles section transitions immediately.
Artworks are ordinary HTML images.
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
| `node scripts/verify-pencil-overlay.mjs` | Opt-in shared medium wipe, image resize, and reduced-motion checks |
| `node scripts/test-medium-transition.mjs` | Check transition continuity and rapid selection behavior |

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
