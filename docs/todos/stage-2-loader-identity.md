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
- 2026-10-17: Review of the built descent. The user judged the preloader unchanged in character (a looped dash and
  a timed count), the handoff a plain crossfade, and the camera pitch from the map to the overview wrong; of the
  intro alone they prefer the first draft (the wave from the summit seen from the overview, no camera move).
  Three loader-to-landscape directions were mocked side by side on a screenshot of the real overview, scrubbable,
  all with the camera fixed at the overview: https://claude.ai/artifact/TodTZRe8LCL92xmnraiVHq
  A. The climb: the mark's five rings draw in, foot to peak, as the five real pipeline stages finish (displacement,
     shell, lighting, contours, shader compile and first frames); a one-word stage label replaces the percentage;
     at the peak the mark glides onto the summit's screen position, shrinks to the real rings' scale, and the wave
     sets off from under it while it fades.
  B. One line: a pen draws the mark as one continuous stroke (length = progress), lifts off the peak, arcs down to
     the summit trailing light, and the wave is the same line continuing.
  C. The paused scene: the loader is the real summit's rings projected through the overview camera, appearing as
     stages finish; ready resumes the wave from the held radius, nothing fades (needs the summit's polylines baked
     out and a frame-exact swap; the mark leaves the loader).
  Recommended: A with B's stroke-drawing for each ring. Decision pending.
- 2026-10-17, round 2: the user rejected all three above for the same reason: each carries something (the mark,
  a pen) down to the summit's screen position. Rule adopted for the next round: the mark holds still and the
  scene's reveal starts where the mark is, as a screen-space front from the mark's centre (a small change to the
  contour reveal: screen-space origin and distance instead of the reach field). Loading stays as in A (rings draw
  in, one per pipeline stage). Three exits mocked at the same link (the page was replaced):
  D. The ripple: at ready the rings widen past the screen edges outermost first, a beat apart; each one lights the
     lines it crosses; the peak is the last to go. Recommended.
  E. The dive: the whole mark zooms exponentially toward the viewer; the landscape resolves from the centre in step;
     the viewer passes through the rings into the place.
  F. The emblem stays: the mark loads small at top centre, where it stays as a permanent hero emblem; one front
     from it lights the landscape; nothing exits (changes the hero's balance).
  Decision pending.
- 2026-10-17, round 3: the user set the sequence themselves (the ripple's scaled SVG was rejected as ugly):
  1. loading: the mark's rings draw in, one per pipeline stage (kept from round 1/2);
  2. at ready, more contour lines are drawn around the mark, outward, until the screen is a full contour map (no
     scaling of the SVG; new lines accrete, the mark's rings are the innermost);
  3. a fluid / bleeding-ink reveal spreads out of the contour lines, filling the dark gaps, and the scene shows
     through where the ink has filled (reference: "Kevin's site" and its signature, link not yet given);
  4. under it the terrain keeps the first version's intro (the summit wave from the overview pose); no camera move.
  Mocked at the same link, replaced in place, with sliders for line spacing, lines per second, ink delay per line
  and ink spread. The mock's map is isolines of a 2D field seeded by the mark's outline (offsets of the mark near
  it, wandering into other hills further out); the ink is that field's distance grown over time and held back by
  noise, computed per pixel, which is also the shape of the real implementation (a full-screen pass sampling the
  scene through a grown mask). Decision pending on the mock.
- 2026-10-17: Built as the user set it, with https://kevinzli.com/ as the reference for the ink (its signature is
  written stroke by stroke, then the ink blooms outward in fingers and the city shows through the dense ink; a
  WebGL2 ping-pong simulation with curl flow, fibrous diffusion, a noise-gated bloom and a radial spread). The
  descent, the map pose, the unlit ground and the camera journey kind are gone. Rings draw per real pipeline
  stage with a stage word instead of the timed count; the ink takes the rings over, grows the map, bleeds; the
  terrain's wave runs under it; the hero and scene links enter once the ink has lifted. Timing in Leva's Intro,
  not yet settled.
- 2026-10-17, later: three corrections after the first run. The reveal is simplified to what was asked: no ink
  simulation, no stain; every line widens into a see-through band (a half-res texture dilated a fraction of a
  texel a frame; `revealSpeed` CSS px/s) until the pockets between lines close, then the last of the cover
  fades. The map's field gained landforms of its own (hills, basins, ridges; `mapRelief`) because it read as
  one peak; values still climb outward so the map accretes from the mark. The mark went back to its looping
  highlight (the per-stage rings looked stuck on a slow load); the stage word stays in place of the count. The
  earlier ink's cost (ninety noise octaves per texel, three steps a frame) is gone with it.
- 2026-10-17: the map's density was too uniform; a slow steepness field (`STEEP_WAVELENGTH_PX`, `STEEP_RANGE` in
  `lib/intro/mapField.ts`) now packs lines on steep ground and spreads them on plateaus, scaled by `mapRelief`.
- 2026-10-17: the terrain's wave is the first iteration's unchanged (shaders, config, clock, reach field identical to
  6150723) but it had been set off under the cover at the bloom, so it was already out from the summit when the
  cover lifted; it now sets off as the cover lifts, in view, as before. Both stages are plain durations in Leva
  (`mapSeconds`, `revealSeconds`) instead of lines per second and pixels per second.
