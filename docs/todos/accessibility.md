# Accessibility

Deferred until interaction/layout stabilizes or a related task needs the fix.
Observed in the 2026-09-29 review; recheck against current code before acting.

- [ ] **Artwork dialog focus:** opening Ama Dablam then pressing Tab focuses K2
  behind the dialog. Add initial focus, containment, and background inertness in
  `components/artworks/ArtworkLightbox.tsx`; preserve trigger focus restoration.
- [ ] **Drawer focus:** define desktop/mobile modal behavior and focus entry/exit
  in `components/home/drawer/Drawer.tsx`.
- [ ] **Fallback access:** Enter Without Terrain removes About/contact controls.
  Review `components/home/Home.tsx`, `components/scene/TerrainFallback.tsx`,
  and `components/home/Nav.tsx` when navigation settles.
- [ ] **Semantic structure:** `app/artworks/page.tsx` lacks a page H1; responsive
  Hero instances duplicate `home-hero-title` in `components/home/Home.tsx`.
- [ ] **Reading and control access:** review small/muted copy, artwork captions
  available on hover, keyboard/touch access, zoom, and reduced motion after the
  visual system settles. Full accessibility testing remains unperformed.
