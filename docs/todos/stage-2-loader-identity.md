# Stage 2: First-arrival loader identity

Status: queued for design, after loading-state boundaries are defined.

This document tracks exploration, decisions, references, and implementation for
this workstream. Accepted direction is recorded separately from open design choices.

## Objective

Make first arrival establish atmosphere and lead naturally into the landscape.
Adapt to real readiness without prolonging a fast load for animation.

## Accepted direction

- The homepage already greets the visitor and establishes personal identity.
  The loader may omit a personal introduction; repeating the greeting or adding
  a signature is not a requirement. Evaluate the loader and homepage as one sequence.

## Findings and evidence

- The user likes the contour icon but finds the animation unremarkable.
- The current mark already relates to the terrain. Its repeating stroke animation
  and separate pixel dissolve offer an opportunity for more coherent choreography.
- [Preloader](../../components/home/preloader/Preloader.tsx) uses
  a timed count toward 90 in normal motion, then completes on readiness; it is not
  a continuously measured loading percentage.
- Timing lives in [preloader config](../../config/preloader.ts), stroke animation
  in [Preloader.css](../../components/home/preloader/Preloader.css), and exit rendering in
  [PixelDissolve](../../components/home/preloader/PixelDissolve.tsx).

## Exploration and open decisions

- Starting direction: contours resolve, establish depth, then hand attention to
  the landscape and navigation. Compare alternatives before locking a sequence.
- Preserve the liked mark as the starting point; decide how directly it connects
  to the rendered terrain versus a simpler visual echo.
- Decide whether to use measured progress, named preparation stages, or an
  indeterminate signal. Avoid implying precision the implementation cannot provide.
- Design short, long, interrupted, and reduced-motion versions of the sequence.
- Define the moment content becomes usable and avoid a mandatory animation delay.

## Work and validation

- [ ] Establish first-arrival versus return behavior with the lifecycle workstream.
- [ ] Collect and annotate motion references.
- [ ] Storyboard and compare loader-to-scene sequences.
- [ ] Choose progress feedback and readiness/exit rules.
- [ ] Prototype and verify fast, slow, reduced-motion, and fallback paths.

Success: the animation has a recognizable purpose and destination, communicates
waiting honestly, and releases visitors promptly when the experience is ready.

## References

- User stage 2 brief and Designly-assisted review, 2026-09-29, in this chat.
- Existing contour icon and terrain are the primary visual references.
- [Loading and return](stage-2-loading-and-return.md) owns when feedback is needed.
- Add external references with URL, useful motion principle, and what to avoid copying.

## Decision log

- 2026-09-29: User clarified that personal identity can be established by the
  homepage greeting rather than the loader. Develop atmosphere and the transition
  into that greeting; no separate personal introduction is required.
- 2026-09-29: User requested a dedicated document to track this design process.
  Contour-to-landscape choreography is a proposal; timing and progress display remain open.
- 2026-10-13: Descent chosen and implemented. The pixel dissolve is gone: the scene opens as a contour map from
  straight above the summit, the mark fades into the summit's rings as the wave draws the map, and the camera
  lowers to the overview while the ground lights up (`config/scene/intro.ts`, Leva's Intro folder). Opening on a
  section or with reduced motion the preloader fades instead. The bleed was kept only as an idea for a richer
  reduced-motion exit. Timing (delay, descent length, map height, fog, light-in) is tuned live, not yet settled.

Append dated decisions with rationale, alternatives considered, and evidence.

## Experiments and review notes

- 2026-10-13: Two exits from the full-page contour map were mocked side by side
  (animated canvas stand-in, scrubbable): https://claude.ai/artifact/LtBCrdUC4T9iYmYvd3BMMF
  Both share the mark, the count and the summit wave drawing the map outward.
  1. Bleed: the lines widen until the landscape shows through the ink; a 2D curtain, a cut to the scene.
  2. Descent: the map is the real contour lines seen from straight above the summit; the camera lowers to the
     overview pose while the ground lights up. One sequence, reuses `IntroReveal` instead of repeating it.
  Recommended: descent; chosen and built the same day (see the decision log).
