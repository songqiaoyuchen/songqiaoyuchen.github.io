# Production

Deferred to stabilization/release review unless an item blocks the current task.
Evidence below is from 2026-09-29, not a guarantee of current failures.

- [ ] **Build scope:** compilation passed but type checking included generated
  `out/_next/static/media/terrain.worker.*.ts` and failed on missing imports.
  Review `tsconfig.json` exclusions and exported worker bundling. Revisit when
  this blocks verification; validate clean Pages export during release review.
- [ ] **Lint baseline:** 17 existing `max-len` errors in `data/aboutTimeline.ts`,
  `data/artworks.ts`, and `data/projects.ts`. Clean up when touching those files
  or stabilizing checks.
- [ ] **Metadata/discovery:** set `NEXT_PUBLIC_SITE_URL` in the Pages workflow;
  `app/layout.tsx` falls back to localhost. Review social titles/descriptions,
  canonical URLs, sitemap, and robots behavior before release.
- [ ] **Delivery/performance:** inspect static-export image delivery and terrain
  startup/GPU cost on representative hardware. Reviewed source totals were
  6.31 MB compressed terrain and 10.84 MB artwork, not measured page transfers.
  Check cold/cached behavior and hosting cache headers during release review.
- [ ] **Resilience:** review scene/asset failure, cancellation, no-JavaScript
  entry, and slow loading after startup behavior stabilizes. Global navigation
  is currently blocked by the preloader; initial HTML lacks the introduction.
