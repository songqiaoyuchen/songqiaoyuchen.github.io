# Stage 2: Navigation, URLs and view hierarchy

Status: Art and About navigation implemented; other section navigation remains deferred.
Design alongside the [Art journey](stage-2-art-journey.md).

## Implemented Art slice

`/artworks`, `/artworks/all`, and `/artworks/[id]` share the persistent `(scene)`
layout. Both Art entry points use the selected gallery. Query state preserves
selection/filter/source; details restore scroll and focus on local return.
Direct details return to All works. Re-selecting active Art leaves the current
view intact. Other section destinations keep their current behavior.

## Accepted decisions

- Linkstreams and the existing top nav lead to the same section entry and default
  view. Transitions may differ by origin; the destination has the same meaning.
- Reuse the top nav as the compact section navigator when linkstreams withdraw.
  Do not add another competing navigation bar or require Home before switching sections.
- SQYC/Home returns to the landscape overview and full linkstreams. Local return
  goes back to the containing collection; it is distinct from Home and section switching.
- Section and meaningful detail navigation changes the URL. Preserve direct
  entry, refresh, and browser Back/Forward. Incidental hover/effects need no URL.
- Full-viewport section content can remain addressable route views. Do not remove
  routes merely to create a continuous experience or require every view to be a modal.
- The active section remains highlighted in deeper views. Re-selecting the active
  section should not unexpectedly reset browsing. Returning from a detail restores
  its source collection, filter, and position.
- Full spatial transitions accompany entry from the landscape; section-to-section
  switching uses shorter transitions. Direct links expose usable content without
  requiring the homepage entrance sequence. Actual loading still needs feedback.
- Places is a separate section from Blog, with its own linkstream and matching
  top-nav destination. Blog stays unchanged; Projects scope is navigation only.

## Current issue and ownership

[Nav](../../components/site/Nav.tsx) and [SceneShell](../../components/shell/SceneShell.tsx)
now share the Art destination. Other sections still have separate previews and
archives; migrate those only within their own workstreams.
[Layout](../../app/layout.tsx) owns the persistent top nav.

## Open design and implementation choices

- Apply lessons from Art's implemented route map to future section work.
- Design the handover from streams to top nav, including its homepage prominence,
  smaller-screen treatment, and complete section coverage such as About/contact.
- Define a predictable local return for directly opened details with no prior
  collection history. Preserve browser history without creating navigation loops.
- Extend route/layout/state architecture with the
  [loading workstream](stage-2-loading-and-return.md); Home/Art persistence is implemented.
- Include the accepted [Places](stage-2-places.md), [About](stage-2-about-path.md),
  and [lake](stage-3-lake-exploration.md) directions in future route/view design.
  The lake's entry is the basin; its additional navigation representation is open.
  These are deferred plans, not authorization to implement in this documentation task.

## Work and validation

- [ ] Define the view/route map and navigation behavior using Art first.
- [ ] Make both entry mechanisms resolve to the same section destination.
- [ ] Implement top-nav handover, local return, and optional Home navigation.
- [ ] Verify section switching, active states, direct entry, refresh and Back/Forward.
- [ ] Verify detail return restores collection context without accidental resets.
- [ ] Verify keyboard/touch and terrain-fallback navigation; related findings are
  tracked in [Accessibility](accessibility.md).

## Decisions, references and experiments

- 2026-09-29: User accepted URL-changing navigation, then the unified section model
  with top-nav switching and Art as the first prototype. Actual route syntax and
  appearance remain open.
- Source: stage 2 discussion in this chat. No external reference is selected.
- Art's complete route journey is implemented and browser-verified. See
  [architecture](../architecture.md) for routes and the repeatable check command.
