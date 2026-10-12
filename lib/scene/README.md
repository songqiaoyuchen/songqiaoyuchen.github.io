# lib/scene

| File | Purpose |
| --- | --- |
| `camera.ts` | Homepage field of view that keeps the authored framing on wider/narrower screens |
| `cameraJourney.ts` | Journey planning: the one motion between two poses and its kind, which sets its pace (node-tested) |
| `cameraTransition.ts` | Camera journey: eased position, slerped orientation (node-tested) |
| `aboutPath.ts` | About route through the checkpoints and each checkpoint's camera framing (node-tested) |
| `travel.ts` | Travel globe: places on the sphere, yaw/pitch toward the camera, drag release, coast, capture and snap, track densifying, coastline file format, trip framing, the zoom-out's planet scale and ride wrap for CPU-laid-out layers (node-tested) |
| `travelWorker.ts` | Pure maths the travel worker runs: elevation map blur/summary, bilinear sampler, light point sampling (node-tested) |
| `travel.worker.ts`, `travelWorkerTypes.ts` | The travel worker: decodes the elevation map off the main thread and builds the summary and light points; its messages |
| `travelElevation.ts` | Main-thread client of the travel worker with a same-thread fallback |
| `landShading.ts` | Registers `shaders/terrain/landShading.glsl` as the `<land_shading>` chunk for the terrain, regional ground and globe shaders |
| `textTransition.ts` | Scene text dissolve stepping; layouts swap only while hidden (node-tested) |
| `frameBudget.ts` | Waits for idle time and healthy frames before the next startup stage |
| `screenPass.ts` | Full-screen quad pass into an offscreen target |
| `stillFrames.ts` | Frame signature for skipping identical frames; `markFrameChanged` for offscreen renders |
