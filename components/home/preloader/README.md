# components/home/preloader

Full-screen loading screen shown on the homepage until the scene is ready. Timing: `config/preloader.ts`. On first
arrival at the overview its exit is the intro's descent (`config/scene/intro.ts`): the cover lifts off the scene,
opened as a contour map straight above the summit, the mark fades into the summit's rings, and the preloader goes
once the camera has landed on the overview. Opening on a section it fades.

| File | Purpose |
| --- | --- |
| `Preloader.tsx` | Contour mark, count-up readout, "Enter without terrain" bypass |
| `Preloader.css` | All preloader styles, including the descent and fade exits and the reduced-motion variant |
| `MountainContour.tsx` | The SVG contour mark with its spiralling highlight |
| `CountUp.tsx` | Animated percentage counter |
| `useNavLock.ts` | Makes the site nav inert and locks scroll while loading |
