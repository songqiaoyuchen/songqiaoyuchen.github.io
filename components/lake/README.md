# components/lake

The lake dive's HTML and state (stage 3, `docs/todos/stage-3-lake-exploration.md`): the shell mounts them over
the canvas, where `components/scene/lake` draws the lake and the crack.

| File | Purpose |
| --- | --- |
| `lakeState.ts` | The flow's stages, the player's input and the dive's telemetry (plain mutable objects crossing between the HUD and the canvas every frame), and what the browser remembers of a finished dive |
| `useLakeFlow.ts` | The stages and their timers (`LAKE_FLOW`): the flight down, the dive, the bottle and the letter or the hull's breach, the flight back; ends at once when a section opens or the route leaves |
| `LakeHud.tsx` | The dive screen: wall readouts counting up with the ping's front, depth, speed, the hull, the sonar's cooldown bar, the scanning label, the system's red warnings and the breach screen, a hint and the Surface control; owns the input (keys, drag to steer, tap or space to ping, Escape to surface) |
| `LakeLetter.tsx` | The letter in the bottle, a plain HTML dialog of paper sheets read off a stack (arrows, swipe, tap); closing it in the crack surfaces |
| `Lake.css` | The veil, the dive screen, the letter, the lake's HTML controls, and the nav stepping aside under water |
