# Stage 2: About experience path

Status: first prototype implemented (2026-10-06), route `/about?entry=` added 2026-10-07; awaiting visual review.

## Accepted direction

- Present readable About information, resume access and an experience list beside
  a winding path with checkpoints across the existing terrain, ending with an
  open-ended "Next?" point (side composition: see refinements below).
- The path is a metaphor for experience, not real geography. Explicit dates and
  chronology carry the sequence; terrain elevation does not rank achievements.
- Selecting an experience from the list or its checkpoint opens the same detail state.
  The camera shifts with a slight zoom, the selected checkpoint becomes brighter/larger,
  and the text area shows that experience's details.
- Keep other checkpoints visible and clickable where framing permits. A local back
  control restores the overview because a selected view may not show every checkpoint.
- Keep the authored chronology and restrained camera framing distinct from Places's
  freely explored, geographically accurate globe.
- Follow [shared navigation](stage-2-navigation.md), retaining direct access to About,
  resume/contact and readable content without depending on the terrain interaction.

## Accepted refinements (2026-10-06)

- Keep and improve the existing drawer timeline (route line, markers, Connect
  footer); do not replace it with a plain list. Text sits on the right, terrain
  on the left, with the path climbing a ridge to a "Next?" summit.
- The drawer's scroll reading head is the selection: when it settles on an entry,
  the camera frames that checkpoint; clicking a checkpoint scrolls the drawer to
  its entry. Scrolling back to the top is the overview. Selection updates the URL
  (`?entry=`) in place rather than adding history per scroll step.
- Order entries oldest first by start date; show the start month and year only.
  Scrolling down climbs the ridge, ending at "Next?" beside Connect.
- Content side follows camera framing (opposite the framed subject). Blog and
  Projects keep their left drawer until their own workstreams.
- The path zig-zags across several ridges, as in the sketch, and is always visible but
  faint; the drawer's scroll draws it continuously, like the timeline's route line.
- Checkpoints: the diamond marker with lock-on reticle (HUD-inspired, kept), a leader line
  and the entry's title as in the timeline, unframed. No glitch or extra wording.
- Composition: the path is the one bright, glowing element; the trail ahead is dashed
  like a map trail. About replaces the homepage contours with thin, evenly spaced map
  contours lit like the terrain beneath (dark ground, dark lines) and quieter away from
  the route, plus a few altitude figures for flavour. Distant lines keep a minimum width
  and darken rather than vanish. The ground itself falls to the background with distance
  from the centre (`edgeFade`), so no camera or flight sees the plane's edge. Clouds were
  tried (volumetric, then HUD dots) and removed: they patched the edge symptom and broke
  the HUD feel.
- One signal colour besides gold, for the route only (path, trail ahead, markers):
  default cyan, adjustable in Leva. Titles, links and focus stay gold.
- Entering a journey section (Art, About, later Places) clears the glyph rain, scene
  links and hero text, which return only after the camera is home. SQYC returns to the
  landscape overview; the top of the drawer returns to the About pose (no separate control).
- The About drawer gets breathing room: wider, with its column held off the right edge.

## Open prototype decisions

- Review the zig-zag route, framing (focus point/follow/zoom), map contour density and
  fade, path glow and label legibility in the live scene.
- Smaller-screen composition: phones keep the full-width drawer without the path.

## Work and validation

- [ ] Prototype overview → scroll to an entry → click another checkpoint → back to top.
- [ ] Verify drawer scroll and checkpoint selection stay synchronized and chronology stays clear.
- [ ] Check detail legibility, visible checkpoint interaction and local return.
- [ ] Verify essential information and actions across keyboard, touch and terrain fallback.

## Reference

User's illustrated brief and clarified direction, 2026-09-30, in this chat.
Source illustration: `6190261734833067763.jpg` (Experience Section).
Current content starts in `data/`; existing interaction is
[ExperienceTimeline](../../components/home/drawer/about/ExperienceTimeline.tsx).
