# lib/scene

| File | Purpose |
| --- | --- |
| `camera.ts` | Homepage field of view that keeps the authored framing on wider/narrower screens |
| `cameraTransition.ts` | Camera journey: eased position, slerped orientation (node-tested) |
| `aboutPath.ts` | About route through the checkpoints and each checkpoint's camera framing (node-tested) |
| `travel.ts` | Travel globe: places on the sphere, yaw/pitch toward the camera, drag release, coast, capture and snap, track densifying, coastline file format, trip framing (node-tested) |
| `landShading.ts` | Registers `shaders/terrain/landShading.glsl` as the `<land_shading>` chunk for the terrain, regional ground and globe shaders |
| `textTransition.ts` | Scene text dissolve stepping; layouts swap only while hidden (node-tested) |
| `frameBudget.ts` | Waits for idle time and healthy frames before the next startup stage |
| `screenPass.ts` | Full-screen quad pass into an offscreen target |
| `stillFrames.ts` | Frame signature for skipping identical frames; `markFrameChanged` for offscreen renders |
