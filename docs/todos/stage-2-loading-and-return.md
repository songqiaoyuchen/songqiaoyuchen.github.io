# Stage 2: Loading and return continuity

Status: Home/Art continuity implemented; other section lifecycles remain deferred.

Home and Art share a mounted canvas through the `(scene)` route-group layout.
Direct Art entry renders useful content while terrain prepares and skips the
homepage entrance. Returning Home retains the scene. Collection/detail URLs
preserve context; local return restores focus and scroll. Leaving this route
group still releases its scene resources; other sections keep their existing
lifecycle behavior until their own rebuilds.

This document tracks exploration, decisions, references, and implementation for
this workstream. Accepted requirements are recorded separately from open design choices.

## Objective

Make returning to the homepage feel like resuming a place. Separate first arrival,
ordinary navigation, and actual waiting without hiding unfinished scene setup.

## Accepted requirements

- Support the accepted [navigation and history behavior](stage-2-navigation.md).
  This tracker owns scene readiness and restoration mechanics, not URL design.
- Restore the selected trip and globe pose after leaving its media/reading view,
  alongside Art's collection/filter/position restoration. Return must not replay
  the section entrance. Transition lengths by origin are owned by Navigation.

## Findings and evidence

- The original `/artworks` Back path replayed the homepage loader; the shared
  Home/Art layout now keeps the canvas and readiness state mounted.
- [SceneShell](../../components/shell/SceneShell.tsx) starts in `loading` on each mount.
  [SceneCanvas](../../components/scene/SceneCanvas.tsx) schedules
  cleanup; [terrain assets](../../lib/terrain/assets.ts) disposes prepared resources.
  HTTP-cached files do not imply a ready CPU/GPU scene.
- Art selection and filter now live in the URL. Other section state remains
  component-local and will need restoration as those sections are rebuilt.

## Exploration and open decisions

- Define feedback for first arrival, section changes, route departure, warm
  return, slow preparation, and failure.
- Compare keeping the scene resident, retaining prepared data, and rebuilding
  behind an appropriate return view. Record memory, GPU, and latency tradeoffs.
- Implement the agreed restoration of section, collection and browsing position.
  Decide camera restoration and resource retention separately; distinguish browser
  Back from an intentional return to the landscape overview.
- Ready content should not wait for a loading ceremony; real waiting still needs
  understandable feedback and an exit to the terrain fallback.

## Work and validation

- [ ] Map readiness states onto the agreed navigation/return behavior.
- [ ] Compare lifecycle options and record the chosen approach.
- [ ] Prototype and implement the return journey.
- [ ] Verify cold arrival, cached return, repeated navigation, and slow/failing setup.
- [ ] Verify restored content and navigation work with keyboard and reduced motion.
- [ ] Verify readiness on direct entry, refresh and history navigation alongside
  the route checks owned by [Navigation](stage-2-navigation.md).

Success: a warm return preserves the intended context without replaying the
first-arrival introduction, and unfinished setup never becomes a blank dead end.

## References

- User stage 2 brief and Designly-assisted review, 2026-09-29, in this chat.
- [First-arrival choreography](stage-2-loader-identity.md) owns the visual sequence.
- [Art journey](stage-2-art-journey.md) owns the content-specific transition design.
- [Production](production.md) retains broader delivery/performance and resilience review.
- Add external references with a URL and the specific behavior worth studying.

## Decision log

- 2026-09-29: URL design and shared navigation decisions are grouped in
  [Navigation](stage-2-navigation.md); scene lifecycle and resource choices remain here.
- 2026-09-29: User requested a dedicated document to track this design process.
  Lifecycle choice and the mechanism for restoring agreed context remain open.

Append dated decisions with rationale, alternatives considered, and evidence.

## Experiments and review notes

The Home/Art persistent-layout approach is implemented and browser-verified.
Other lifecycle options remain relevant when rebuilding additional sections.
