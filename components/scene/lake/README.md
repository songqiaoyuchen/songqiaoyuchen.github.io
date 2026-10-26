# components/scene/lake

The lake on the homepage terrain and the dive beneath it, inside the canvas (`SceneCanvas` mounts both with the
scene text; the HTML side is `components/lake`).

| File | Purpose |
| --- | --- |
| `LakeSurface.tsx` | The water over the plain below the hero: a disc at the lake's level cut to an irregular shore, hidden by the terrain cache's depth where the ground rises above it (`shaders/lake/lake.*`); hover glow; an HTML button over it starts the dive, another reopens the letter once found |
| `LakeDive.tsx` | The crack's walls (`lib/scene/lake.ts` geometry, `shaders/lake/crack.*` sonar), the bottle in the chamber, and the camera: the flight down to the water, the craft's view in the crack from the HUD's input, the flight back up; sends the player's pings on a cooldown and writes the HUD's telemetry |
