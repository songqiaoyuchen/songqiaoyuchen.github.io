# Stage 2: Unified Art journey

Status: implemented and verified, 2026-10-01.

Production compilation/type checking, static export, and all 13 Art browser
check groups pass. Desktop, narrow, tablet, touch, reduced-motion, no-JavaScript,
unavailable-WebGL and image-failure artifacts were reviewed. Changed files pass
lint; the two unrelated existing lint errors remain in [Production](production.md).
Browser verification used Chromium with emulated touch, not physical mobile devices.

## Current behavior

- Both the terrain Art link and top-nav Art item enter `/artworks`.
- Desktop uses a 40/60 terrain/gallery composition, with a curved horizontal
  carousel, minimal frames, selectable faded neighbors, and descriptions below.
  Neighbor spacing follows displayed artwork dimensions. The selected scene
  fits the viewport at normal text size; All works remains a scrolling archive.
- Narrow and touch layouts use a vertical carousel, with visible previous/next
  controls. Short landscape screens place the caption beside the carousel.
  Keyboard, wheel, and pointer inputs work without visible instruction copy.
- Home and All works sit at the edges without a divider or counter row. Artwork
  titles precede material/dimensions; descriptions retain Krypton at a
  readable size. The left terrain area has no display heading or slogans.
- `/artworks/all` contains the full collection with Oil, Digital, and Pencil
  filters. `/artworks/[id]` opens a fitted full-screen inspection dialog.
- URL state preserves selected work, medium filter, and inspection source.
  Closing restores collection position and focus. Direct details return to All
  works. Browser Back/Forward and refresh retain meaningful state.
- Home and Art keep the same terrain canvas mounted. Direct Art entry does not
  wait for the homepage introduction. Linkstreams withdraw and the existing top
  navigation stays available in collection views.
- Warm Art entry moves the live camera and look-at to the Art pose, including on
  mobile. The gallery and medium treatment wait for camera arrival; terrain
  contours and decoration blend out. Reduced motion skips the travel.
- Terrain-only material compositing provides painted color/brush texture, light
  pencil strokes on dark, and digital particles. Transitions settle on medium
  changes; same-medium selection does not restart them. Artwork pixels and UI
  colors are unaffected. Reduced motion changes the medium immediately.
- Collection links and direct artwork content are server-rendered. Browsing and
  inspection remain usable without terrain; collection/detail links also work
  without JavaScript.

## Ownership and verification

- [Art section](../../components/art/ArtSection.tsx): selection,
  collection/filter URLs, gestures, and return context.
- [Inspection](../../components/art/inspection/Inspection.tsx): native modal,
  fitted image, caption, focus containment, and loading feedback.
- [Terrain](../../components/scene/terrain/CachedTerrain.tsx): backdrops.
- [Routes](../architecture.md): persistent layout and route responsibilities.
- [Browser checks](../../scripts/verify/verify-art.mjs): full journey, desktop/mobile
  screenshots, touch, reduced motion, no-JavaScript and unavailable-WebGL paths.
- [Camera checks](../../scripts/verify/verify-art-camera.mjs): frame-by-frame camera
  continuity, focus, canvas persistence, gallery timing, and return Home.
- [Layout checks](../../scripts/verify/verify-art-layout.mjs): all six works across
  desktop/phone/landscape sizes, viewport fit, visible neighbors and navigation.

## Source and scope

The supplied sketch is `6190261734833067764.jpg` (Art Section). Existing
[artworks and descriptions](../../data/artworks.ts), including the six featured
works and their order, remain the source content.

The viewer fits the complete image; zoom/pan is not part of the accepted first
implementation. New captions, dates, and collection curation remain in
[Content](content.md). Other section rebuilds remain separate workstreams.
