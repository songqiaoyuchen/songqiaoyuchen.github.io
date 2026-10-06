# components/art/transition

Animated switch between Selected and All works: the visible works fall onto a tilted "table", then
rise into the other layout. Timing lives in `config/art/galleryTransition.ts`.

| File | Purpose |
| --- | --- |
| `useGalleryTransition.ts` | Snapshots before navigation; sets up and tears down the transition after it |
| `choreography.ts` | Builds the table and starts every keyframe animation (mask, cards, clones, text) |
| `measure.ts` | Reads tiles, poses, carousel mask and collection slots from the DOM |
| `matrix.ts` | Easing curves and matrix decompose/compose/slerp |
| `GalleryTransition.css` | The fixed layer that holds the clones |
