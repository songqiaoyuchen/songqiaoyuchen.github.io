# SQYC

Song's personal website: a calm, atmospheric space for work, writing, art, and personal history. The homepage combines an interactive topographic WebGL scene with semantic navigation, while the archive and article routes favor fast, readable, server-rendered content.

This project is actively evolving. The current public surfaces are:

- `/` — immersive terrain homepage with section previews and a graceful non-WebGL fallback
- `/projects` — complete project archive, with cards linking to source repositories
- `/artworks` — categorized artwork archive and lightbox viewer
- `/blog` — writing archive backed by local MDX
- `/blog/[slug]` — statically generated article pages

## Highlights

- Custom Three.js terrain, contours, shaders, text streams, bloom, and depth effects
- A functional preloader tied to genuine scene readiness, with reduced-motion and failure states
- Pre-baked, content-hashed terrain artifacts that keep deterministic work out of browser startup
- Semantic HTML navigation and content independent of the WebGL enhancement
- Local MDX publishing with build-time syntax highlighting and reusable editorial components
- Responsive, keyboard-accessible project, artwork, writing, and about experiences
- Development-only Leva controls for tuning scene configuration

## Technology

- [Next.js](https://nextjs.org/) App Router, React, and TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [React Three Fiber](https://r3f.docs.pmnd.rs/), Three.js, Drei, and React Three Postprocessing
- [GSAP](https://gsap.com/) and [Motion](https://motion.dev/) for focused interface animation
- [MDX](https://mdxjs.com/), Rehype Pretty Code, and Shiki for writing
- Custom GLSL shaders and a worker-backed terrain asset pipeline

## Getting started

### Prerequisites

- Node.js 20.9 or newer
- npm
- A browser with WebGL for the full homepage experience

### Install and run

```bash
git clone https://github.com/songqiaoyuchen/sqyc.git
cd sqyc
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No environment variables are required for local development.

For canonical production metadata, set the optional site origin:

```bash
NEXT_PUBLIC_SITE_URL=https://example.com
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Next.js development server |
| `npm run lint` | Run ESLint across the project |
| `npm run build` | Validate the terrain bake and create a production build |
| `npm run start` | Serve the production build |
| `npm run bake:terrain` | Regenerate deterministic terrain assets |
| `npm run check:terrain-bake` | Verify that checked-in terrain assets match their source and configuration |
| `npm run sync:artwork-dimensions` | Read artwork files and update their dimensions in `data/artworks.ts` |

## Content workflows

### Publish an article

Create `content/<slug>/index.mdx`, where `<slug>` is lowercase and hyphenated. Export the required metadata before the article body:

```mdx
export const article = {
  title: 'A new field note',
  description: 'A concise summary used by the archive and page metadata.',
  publishedAt: '2026-08-13',
  readingMinutes: 5,
  tags: ['Design', 'Process'],
}

## Start the article here
```

The folder is discovered automatically and becomes `/blog/<slug>`. Article routes are statically generated, and articles are sorted by `publishedAt`. MDX can use the registered `Callout` and `Figure` components; fenced code blocks are rendered through the shared `CodeBlock` treatment.

### Update projects or artwork

- Edit `data/projects.ts` to update the project archive and homepage selection.
- Add artwork images under `public/images/artworks/`, then update `data/artworks.ts`.
- Run `npm run sync:artwork-dimensions` after adding or replacing artwork files.

### Rebuild terrain assets

Run `npm run bake:terrain` after changing the source heightmap or any terrain setting included in the bake configuration. Generated files live in `public/textures/terrain/baked/` and are committed so production can load ready-to-use compressed buffers.

`npm run build` runs the bake check automatically and stops with a regeneration instruction when the artifacts are stale. See [the terrain pre-baking guide](docs/terrain-baking.md) for the artifact format and invalidation rules.

## Project structure

```text
app/          Routes, layouts, metadata, global styles, and route handlers
components/   React UI, WebGL scene, effects, drawers, and development controls
config/       Tuned navigation, preloader, and scene configuration
content/      Local MDX articles, one folder per public slug
data/         Projects, artworks, and about-timeline records
docs/         Product, design, architecture, and accepted decisions
hooks/        Shared client hooks
lib/          Content adapters, terrain pipeline, text geometry, and utilities
public/       Fonts, images, source textures, and baked terrain assets
scripts/      Terrain baking and artwork maintenance scripts
shaders/      GLSL shader sources
workers/      Browser worker entry points
```

## Project guidance

The site's product and technical direction is documented in the repository:

- [Product vision](docs/product/vision.md)
- [Accepted decisions](docs/decisions.md)
- [Architecture](docs/architecture.md)
- [Homepage design direction](docs/design/homepage.md)

The guiding boundary is simple: HTML and SVG own interface and content; WebGL owns terrain and atmosphere. The homepage may be immersive, but deeper pages should remain readable, accessible, indexable, and comfortable without motion or WebGL.
