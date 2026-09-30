# Stage 2: Unified Art journey

Status: unified section direction accepted; design and implementation pending.
First complete interaction prototype, coordinated with navigation and loading/return.

This document tracks exploration, decisions, references, and implementation for
this workstream. Shared accepted requirements are linked below; the rotating
gallery and terrain-medium direction are accepted, with precise layout still open.

## Objective

Design one Art section: enter → browse selected or all works → inspect → return.
Give the selected work enough space and attention, while keeping a recognizable
connection to the homepage environment.

## Accepted decisions

- Both the Art linkstream and top-nav Art item enter the same curated Art view.
  It must already support useful browsing and inspection rather than act as a teaser.
- Selected works, All works, and individual inspection are progressively deeper
  views inside one section. All works expands the collection's scope rather than
  taking visitors to a separate experience where the real browsing begins.
- Art can claim a generous content area while linkstreams withdraw and the
  existing top nav takes over. Exact sizing and the visible terrain remain open.
- A local return restores the collection, filter, and browsing position that opened
  an artwork. Top-nav section switching does not require a visit to Home.
- Direct entry opens the usable Art view without requiring the homepage first.
  Navigation transitions can differ by origin without changing the destination.
- Use [progressive disclosure](stage-2-section-interactions.md) to move from
  browsing to inspection and further detail.
- [Navigation changes the URL](stage-2-navigation.md) for sections and
  meaningful detail views; the exact Art route hierarchy remains to be designed.
- Museum-style rotating gallery: a prominent framed work, partially visible
  neighboring frames, description below, scroll-driven selection, click to enlarge,
  and a View all action within the unified collection journey.
- Only the terrain changes with the selected work's medium: monochrome sketch,
  colored oil/brush textures, or digital particle treatment. Artwork colors and
  texture remain faithfully displayed; typography and controls keep their identity.
- Treat this as terrain shader/material variation, potentially using diffuse maps.
  Exact techniques and any additional dependency remain open.
- Transform on medium changes, then settle. Moving between works in the same
  medium should not replay a major transformation. Inspection prioritizes the work.

## Findings and evidence

- The 2026-09-29 desktop review found meaningful browsing in the artwork stack,
  but that interaction largely stays inside the shared preview container.
- The selected artwork occupies a relatively small area while luminous navigation
  and terrain remain dominant. Opening content needs a clearer shift in attention.
- The archive preserves typography and palette but drops most of the homepage's
  spatial character at the route boundary.
- Current ownership: [ArtPanel](../../components/home/drawer/art/ArtPanel.tsx),
  [ArtworkStack](../../components/home/drawer/art/ArtworkStack.tsx),
  [archive](../../app/artworks/page.tsx), and
  [lightbox](../../components/artworks/ArtworkLightbox.tsx).
- User-reported stack issues: hidden elements are clickable and scroll intent is
  unclear. Retaining the current stack is optional; address these when redesigning it.

## Exploration and open decisions

- Choose how to implement the rotating gallery while preserving useful browsing
  and inspection capabilities; retaining the current stack is optional.
- Explore a larger viewing space and a calmer scene once an artwork is selected.
- Carry an artwork, title, or contour element between collection and detail views; choose
  a purposeful transition rather than adding a generic wipe.
- Explore the personal relationship between the mountain paintings and terrain.
  The connection should help visitors understand the work, not force every piece
  into a mountain theme.
- Prototype transitions between contrasting media; decide shader techniques,
  diffuse/brush texture needs, and how terrain forms remain recognizable.
- Design how the accepted restoration behavior is communicated on return.
- Keep the same useful actions on touch, keyboard, and reduced motion; depth
  should not depend on hover or camera movement alone.

## Work and validation

- [ ] Storyboard the complete journey, including reverse navigation.
- [ ] Unify selected works, All works, and inspection within the Art section.
- [ ] Compare browsing/inspection concepts with representative existing artworks.
- [ ] Prototype terrain medium changes alongside real artworks, checking that
  transitions settle and never alter the displayed artwork itself.
- [ ] Resolve hidden stack elements receiving clicks and unclear scroll intent,
  whether the current stack is retained or replaced.
- [ ] Choose the attention hierarchy and transition motif.
- [ ] Prototype one complete journey before generalizing to other sections.
- [ ] Verify content remains readable and inspectable across input modes.
- [ ] Review return context and collection/detail continuity, including direct entry.
- [ ] Address related dialog focus and caption access findings in
  [Accessibility](accessibility.md); coordinate source material with
  [Content and presentation](content.md).

Success: visitors can browse and inspect work comfortably, understand movement
between views, and return without losing their place or repeating an introduction.

## References

- User stage 2 brief and Designly-assisted desktop review, 2026-09-29, in this chat.
- Accepted illustrated direction and clarifications, 2026-09-30, in this chat;
  source illustration: `6190261734833067764.jpg` (Art Section).
- [Existing artwork and descriptions](../../data/artworks.ts), particularly the
  mountain paintings, are personal source material for the terrain relationship.
- [Loading and return](stage-2-loading-and-return.md) owns lifecycle/restoration mechanics.
- [Navigation](stage-2-navigation.md) owns shared destinations, URLs and history.
- [Section interactions](stage-2-section-interactions.md) will reuse successful principles.
- Add visual/motion references with a URL and the specific principle to explore.

## Decision log

- 2026-09-29: User accepted the unified Art section and top-nav handover. Prototype
  selected works, All works and inspection together before generalizing. Current
  gallery and terrain-medium decisions are recorded above; precise routes and layout
  remain open.
- 2026-09-29: User requested a dedicated document to track this design process.
  This file retains design decisions, references and review notes for that journey.

Append dated decisions with rationale, alternatives considered, and evidence.

## Experiments and review notes

No prototype selected yet. Record artifacts, observations, and next actions here.
