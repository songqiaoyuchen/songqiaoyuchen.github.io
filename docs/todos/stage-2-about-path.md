# Stage 2: About experience path

Status: direction accepted; design and implementation pending.

## Accepted direction

- Present readable About information, resume access and an experience list beside
  a winding path with checkpoints across the existing terrain. The sketch places
  text on the left and terrain on the right, ending with an open-ended "Next?" point.
- The path is a metaphor for experience, not real geography. Explicit dates and
  chronology carry the sequence; terrain elevation does not rank achievements.
- Selecting an experience from the list or its checkpoint opens the same detail state.
  The camera shifts with a slight zoom, the selected checkpoint becomes brighter/larger,
  and the text area shows that experience's details.
- Keep other checkpoints visible and clickable where framing permits. A local back
  control restores the overview because a selected view may not show every checkpoint.
- Keep the authored chronology and restrained camera framing distinct from Travel's
  freely explored, geographically accurate globe.
- Follow [shared navigation](stage-2-navigation.md), retaining direct access to About,
  resume/contact and readable content without depending on the terrain interaction.

## Open prototype decisions

- Map real experience entries onto the path; choose checkpoint spacing, labels and dates.
- Camera poses, detail framing and the overview return behavior.
- Smaller-screen composition, list/checkpoint synchronization and reduced motion.

## Work and validation

- [ ] Prototype overview → selected experience → another checkpoint → overview.
- [ ] Verify list and checkpoint selection stay synchronized and chronology stays clear.
- [ ] Check detail legibility, visible checkpoint interaction and local return.
- [ ] Verify essential information and actions across keyboard, touch and terrain fallback.

## Reference

User's illustrated brief and clarified direction, 2026-09-30, in this chat.
Source illustration: `6190261734833067763.jpg` (Experience Section).
Current content starts in `data/`; existing interaction is
[ExperienceTimeline](../../components/home/drawer/about/ExperienceTimeline.tsx).
