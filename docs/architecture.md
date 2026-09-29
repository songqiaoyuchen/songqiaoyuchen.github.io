# Architecture

Current implementation map, not a fixed design direction. Update when structure changes.

## Stack and ownership

Next.js App Router, React, TypeScript, Tailwind; React Three Fiber/Three.js,
Drei, post-processing, and GLSL for terrain. Motion and GSAP support interactions.

| Location | Responsibility |
| --- | --- |
| `app/` | Routes, layout, metadata, global styles, development API |
| `app/page.tsx` → `components/home/Home.tsx` | Server-loaded article summaries → client scene readiness, fallback, preview state |
| `components/home/drawer/` | Lazy About, project, art, and blog previews |
| `components/scene/`, `shaders/` | Terrain, effects, scene-mounted HTML stream controls |
| `components/artworks/`, `components/blog/` | Archive/viewer and editorial UI |
| `data/` | Projects, artworks, About timeline/contact |
| `lib/content/`, `content/`, `mdx-components.tsx` | Server MDX loader, articles, registered components |
| `lib/terrain/`, `lib/text/` | Terrain worker/assets and glyph geometry |
| `config/`, `app/globals.css` | Tunable scene/layout values and shared style tokens |
| `public/`, `scripts/` | Local fonts/media/baked assets and generation utilities |

The homepage is a single viewport with a preloader, WebGL scene, and preview
drawers. Archives live at `/projects`, `/artworks`, and `/blog`; About/contact
currently lives in its drawer. Project cards link directly to repositories.

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
| `npm run sync:artwork-dimensions` | Update artwork dimensions |

`.github/workflows/nextjs.yml` enables `GITHUB_PAGES=true`, omits the dev API
route, and exports to `out/`. That mode disables Next image optimization.
`NEXT_PUBLIC_BASE_PATH` configures the base path; `NEXT_PUBLIC_SITE_URL`
configures metadata's origin. Next server cache headers do not apply to Pages.

Verification behavior lives in [workflow](workflow.md); known gaps live in
`todos/`. Neither needs to be duplicated here.
