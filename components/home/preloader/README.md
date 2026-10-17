# components/home/preloader

Full-screen loading screen shown on the homepage until the scene is ready: the contour mark with its spiralling
highlight and, beneath it, the real loading stage under way (`config/preloader.ts`). On first arrival at the
overview its exit is the intro (`config/scene/intro.ts`): the cover takes over the rings, grows a contour map out of
them until it fills the screen, then widens every line into a see-through band until the scene shows whole; the
preloader goes once the cover has lifted. Opening on a section, with reduced motion or without WebGL2 it fades.

| File | Purpose |
| --- | --- |
| `Preloader.tsx` | Contour mark, stage label, "Enter without terrain" bypass; mounts the cover once the scene is ready |
| `IntroInk.tsx` | The intro's cover: a WebGL2 canvas over the scene, brush strokes from `lib/intro/inkPlan.ts`, the widening and output shaders (`shaders/intro/`); reports the lift so the terrain's wave can set off |
| `Preloader.css` | All preloader styles, including the cover and fade exits and the reduced-motion variant |
| `MountainContour.tsx` | The SVG contour mark with its spiralling highlight (paths in `lib/intro/markPaths.ts`) |
| `useNavLock.ts` | Makes the site nav inert and locks scroll while loading |
