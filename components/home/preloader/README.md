# components/home/preloader

Full-screen loading screen shown on the homepage until the scene is ready. Timing: `config/preloader.ts`.

| File | Purpose |
| --- | --- |
| `Preloader.tsx` | Contour mark, count-up readout, "Enter without terrain" bypass |
| `Preloader.css` | All preloader styles, including the exit and reduced-motion variants |
| `MountainContour.tsx` | The SVG contour mark with its spiralling highlight |
| `CountUp.tsx` | Animated percentage counter |
| `PixelDissolve.tsx` | Canvas of dark cells that dissolves when the preloader exits |
| `dissolvePixels.ts` | Cell grid and drawing maths for `PixelDissolve` |
| `useNavLock.ts` | Makes the site nav inert and locks scroll while loading |
