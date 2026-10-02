# Production

Deferred to stabilization/release review unless an item blocks the current task.
Evidence below is from 2026-09-29, not a guarantee of current failures.

- [ ] **Next Windows export workaround:** `scripts/fix-windows-export.mjs`
  supplies dotted prefetch filenames missing from Next 16.3 Windows exports.
  Revisit after upgrading Next and remove once the exporter normalizes path
  separators. Linux deployment builds skip the workaround. Generated output
  is excluded from TypeScript checks; worker loading is verified in Art checks.
- [ ] **Lint baseline:** two existing `max-len` errors remain in
  `data/aboutTimeline.ts:28` and `data/projects.ts:91`. The artwork data was
  formatted during the Art rebuild. Clean up the others when those files change.
- [ ] **Metadata/discovery:** set `NEXT_PUBLIC_SITE_URL` in the Pages workflow;
  `app/layout.tsx` falls back to localhost. Review social titles/descriptions,
  canonical URLs, sitemap, and robots behavior before release.
  Add a site icon: on 2026-10-02, Chrome requested `/favicon.ico` and received
  HTTP 404 during scene-transition checks; no icon is declared in `app/layout.tsx`.
- [ ] **Delivery/performance:** inspect static-export image delivery and terrain
  startup/GPU cost on representative hardware. Reviewed source totals were
  6.31 MB compressed terrain and 10.84 MB artwork, not measured page transfers.
  Check cold/cached behavior and hosting cache headers during release review.
- [ ] **Resilience:** review scene/asset failure, cancellation, no-JavaScript
  entry, and slow loading after startup behavior stabilizes. Global navigation
  is currently blocked by the preloader; initial HTML lacks the introduction.
