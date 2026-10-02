# Accessibility

Deferred until interaction/layout stabilizes or a related task needs the fix.
Observed in the 2026-09-29 review; recheck against current code before acting.

## Art browsing and inspection

Coordinate with the [Art journey](stage-2-art-journey.md).

- [x] **Artwork dialog focus:** the replacement `ArtInspection` uses a native
  modal, contained Tab navigation, initial close-control focus, and collection
  trigger focus restoration. Verified through the Art browser checks.

## Navigation and section views

Coordinate with [Navigation](stage-2-navigation.md). Recheck findings against the
new interaction structure rather than preserving the current drawer as a constraint.

- [ ] **Drawer focus:** define desktop/mobile modal behavior and focus entry/exit
  in `components/home/drawer/Drawer.tsx`.
- [ ] **Fallback access:** Enter Without Terrain removes About/contact controls.
  Review `components/home/Home.tsx`, `components/scene/TerrainFallback.tsx`,
  and `components/home/Nav.tsx` when navigation settles.

## Shared structure and readability

- [ ] **Semantic structure:** responsive Hero instances duplicate
  `home-hero-title` in `components/home/Home.tsx`. The rebuilt Art section has
  one H1 and visible, non-hover captions.
- [ ] **Reading and control access:** review small/muted copy, artwork captions
  available on hover, keyboard/touch access, zoom, and reduced motion after the
  visual system settles. Full accessibility testing remains unperformed.
