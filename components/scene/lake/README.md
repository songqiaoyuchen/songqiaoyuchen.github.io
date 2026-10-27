# components/scene/lake

The lake on the homepage terrain and the dive beneath it, inside the canvas (`SceneCanvas` mounts both with the
scene text; the HTML side is `components/lake`).

| File | Purpose |
| --- | --- |
| `LakeSurface.tsx` | The water over the plain below the hero: a disc at the lake's level cut per pixel to the drawn contour there (the contour field as a texture), hidden by the terrain cache's depth where the ground rises above it (`shaders/lake/lake.*`), drawn before the contour lines so the shore line runs whole over it (the lines under it are left out by `Contours`' `lake` prop); hover glow; the pointer meets it only on water (its raycast reads the field), and a click there starts the dive, as does an HTML button over it; another button reopens the letter once found, both dissolving in and out with the scene links (once the camera has arrived, at the links' speeds) |
| `LakePixelRatio.tsx` | Caps the canvas's pixel ratio under water (`maxPixelRatio`) and resizes the composer to match, restoring both on surfacing |
| `LakeDive.tsx` | The crack's walls (`lib/scene/lake.ts` geometry, `shaders/lake/crack.*` sonar, the scanned rock map loaded once the dive begins), the bottle on the basin's floor with its halo, and the camera: the flight down to the water, the craft's view in the crack from the HUD's input, the flight back up; sends the player's pings on a cooldown and writes the HUD's telemetry |
