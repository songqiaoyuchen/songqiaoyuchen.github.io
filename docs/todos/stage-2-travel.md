# Stage 2: Travel

Status: direction accepted; design and implementation pending.

## Accepted direction

- Travel is separate from Blog and has a new linkstream; use the same destination
  from the top nav under the [shared navigation model](stage-2-navigation.md).
- Entry withdraws the linkstreams, pans and lifts the camera, and carries the terrain
  into a full globe view through continuous expressive motion. Motion blur is part
  of the proposed transition, not a geographically literal zoom from the invented terrain.
- The transition must feel like a transformation rather than a visible scene swap.
  If direct continuity is visually weak, explore dissolving terrain into a particle
  cloud that loses its invented shape and reforms as the globe during the zoom-out.
  This is an alternative to test, not a mandated additional effect.
- The globe is drag-rotatable, with highlighted trails and markers reflecting actual
  traveled locations. Geography and routes are real, unlike About's metaphorical path.
- Selecting a trip zooms and enlarges the globe toward a quarter-sphere composition,
  leaving space for the trip introduction and links to a photo gallery or blog article.
  Orientation remains open; not every trip needs an article.
- Quick photo inspection can use a popover/viewer. Long articles need a spacious,
  addressable reading state with a reliable return to the selected trip.
- Return preserves trip selection and globe position; mechanics belong to
  [Loading and return](stage-2-loading-and-return.md). Blog itself is not redesigned.

## Open prototype decisions

- Compare a direct expressive transition with the particle-cloud alternative using
  motion continuity as the criterion; choose blur strength and reduced-motion treatment.
- Globe styling, selected-trip orientation, framing and mobile text/media placement.
- Marker selection, repeated visits, overlapping routes and keyboard/touch discovery;
  consider a companion trip list for locations outside the current globe view.
- Trip data and representative photos/articles, route accuracy and media presentation.

## Work and validation

- [ ] Prototype terrain → globe → selected trip → media/reading → return.
- [ ] Verify the entrance reads as continuous motion rather than a globe swap.
- [ ] Populate representative real trips, including a photo-only trip.
- [ ] Verify selection, readable details, rotation and local return across input modes.
- [ ] Verify direct entry and history with the shared navigation work.

## Reference

User's illustrated brief and clarified direction, 2026-09-30, in this chat.
Source illustration: `6190261734833067765.jpg` (Travel).
