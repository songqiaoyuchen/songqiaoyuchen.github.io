# components

React UI, grouped by the part of the site it belongs to.

| Folder | Purpose |
| --- | --- |
| `site/` | Chrome on every page: the nav and shared content-page classes |
| `shell/` | Persistent shell for Home and Art: one WebGL scene, loading state, fallback |
| `home/` | Homepage overlays: hero, preloader, preview drawer |
| `art/` | Art section: Selected works carousel, All works, inspection, Screenshot mode |
| `projects/` | Project cards (drawer and `/projects`) |
| `blog/` | Article list, article header and MDX components |
| `scene/` | Everything inside the React Three Fiber canvas |

## Conventions

- **Names**: one component per file, file named after it (`Carousel.tsx` exports `Carousel`). Hooks are
  `useX.ts`; plain helpers are camelCase modules. The folder gives context, so names stay short
  (`art/selected/Caption`, not `ArtSelectedCaption`).
- **Scene prefix**: a WebGL element that mirrors an HTML one is prefixed `Scene` — `SceneLinks` (the 3D
  ART/PROJECTS/BLOG/ABOUT words, the scene's counterpart of the nav) and `SceneHeroName`.
- **Backdrop**: the terrain re-rendered as oil, pencil or digital behind the Art gallery.
- **Layers**: markup in `Component.tsx`; Tailwind class strings in `Component.styles.ts` when they would
  crowd the markup; hand-written CSS in `Component.css` beside it; behaviour and animation in `useX.ts`
  hooks or pure modules; copy in `data/`; tunable numbers in `config/`.
- **CSS loading**: component CSS files are not imported by their components. Global ones are listed in
  `styles/globals.css`, Art ones in `app/(scene)/artworks/layout.tsx` — those lists are the
  cascade order. The Art list stays as plain imports (no CSS `@import`) so Tailwind leaves it unprocessed.
- **Hook order**: `ArtSection`, `SceneShell` and the scene components call their hooks in a fixed order
  because effect and `useFrame` order matter. Add new hooks after the existing ones.
