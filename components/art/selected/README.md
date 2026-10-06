# components/art/selected

Selected works: a 3D carousel of featured artworks (horizontal on desktop, vertical on touch) with a
fixed wall label below. Numbers live in `config/art/carousel.ts`; geometry maths in `lib/art/carouselLayout.ts`.

| File | Purpose |
| --- | --- |
| `Carousel.tsx` | Stage, carousel region and slides |
| `CarouselSlide.tsx` | One artwork slide (enlarge when current, select otherwise) |
| `Carousel.css` | Ring perspective, slide transforms, edge fade |
| `useCarouselMotion.ts` | Measures the stage, springs the position, writes slide poses each frame |
| `useCarouselInput.ts` | Wheel, drag/swipe and keys step the `?selected=` URL; outgoing label state |
| `SwipeRail.tsx` / `.css` | Touch-only previous/next rail |
| `Caption.tsx` / `.css` | Live and outgoing wall labels plus the "All works" link |
