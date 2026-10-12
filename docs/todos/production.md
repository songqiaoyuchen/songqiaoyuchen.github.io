# Production

Deferred to stabilization/release review unless an item blocks the current task.
Evidence below is from 2026-09-29, not a guarantee of current failures.

- [ ] **Next Windows export workaround:** `scripts/build/fix-windows-export.mjs`
  supplies dotted prefetch filenames missing from Next 16.3 Windows exports.
  Revisit after upgrading Next and remove once the exporter normalizes path
  separators. Linux deployment builds skip the workaround. Generated output
  is excluded from TypeScript checks; worker loading is verified in Art checks.
- [ ] **Lint baseline:** one existing `max-len` error remains in
  `data/projects.ts:92`. Clean it up when that file changes.
- [ ] **Metadata/discovery:** set `NEXT_PUBLIC_SITE_URL` in the Pages workflow;
  `app/layout.tsx` falls back to localhost. Review social titles/descriptions,
  canonical URLs, sitemap, and robots behavior before release.
  Add a site icon: on 2026-10-02, Chrome requested `/favicon.ico` and received
  HTTP 404 during scene-transition checks; no icon is declared in `app/layout.tsx`.
- [ ] **Delivery/performance:** inspect static-export image delivery and terrain
  startup/GPU cost on representative hardware. Reviewed source totals were
  6.31 MB compressed terrain and 10.84 MB artwork, not measured page transfers.
  Check cold/cached behavior and hosting cache headers during release review.
  Measured on 2026-10-12; findings and fixes live in [performance](performance.md).
- [ ] **Further GPU savings (each changes the look slightly, so not done):** the nav's
  `backdrop-filter` re-blurs the live canvas every frame; glyph rain renders four full-size
  layers per frame (rear layers could render at half size); SMAA adds little at pixel ratio 2;
  slow devices could drop the pixel ratio, bloom levels or SMAA when frames run slow.
  Profiled on 2026-10-12 (GPU timer queries per pass): see [performance](performance.md) for the per-pass budget.
- [ ] **Resilience:** review scene/asset failure, cancellation, no-JavaScript
  entry, and slow loading after startup behavior stabilizes. Global navigation
  is currently blocked by the preloader; initial HTML lacks the introduction.
- [ ] **Unused leftovers (found in the 2026-10 structure refactor):** the npm
  dependencies `gsap`, `clsx`, `tailwind-merge` and `class-variance-authority` have no
  importers (check `@mdx-js/react` against `@next/mdx` before removing it). The legacy
  oil bake (`npm run bake:oil`, `oil-color.webp`, `oil-relief.webp`, `oil-bake.json`) and
  the pencil surface textures (`pencil-noise.png`, `pencil-hatch-*.png` and their
  licences) in `public/textures/terrain/` are no longer read by the site; their shaders
  were removed. `tmp/` (screenshots, prompts, logs) is tracked in git. Decide whether
  to delete each; removing public files changes served URLs.
