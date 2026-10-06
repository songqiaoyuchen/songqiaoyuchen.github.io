# components/scene

Everything inside the React Three Fiber canvas behind Home and Art.

| File / folder | Purpose |
| --- | --- |
| `SceneCanvas.tsx` | The canvas: camera, layers, post-processing, dev tools; mounts layers in stages |
| `useSceneAssembly.ts` | Staged startup (terrain → contours → text → composer → bloom → ready) and progress |
| `SceneErrorBoundary.tsx` | Switches to the static fallback when WebGL fails |
| `SceneReadySignal.tsx` | Reports ready after shaders compile and two frames render |
| `camera/` | Section poses, camera journeys, per-frame camera state |
| `terrain/` | Cached terrain, its compositor, contour lines, fog |
| `backdrop/` | Art backdrops: images, projection, wipe decisions, cursor, Screenshot export |
| `text/` | WebGL text: scene links, hero name, glyph rain |
| `effects/` | Post-processing passes (SMAA, isolated bloom) |
| `controls/` | Leva tuning panels (development only) |

`useFrame` callbacks run by priority, then mount order: dev OrbitControls (-1), CameraRig (-0.75),
SceneFog (-0.7), CameraFrameState (-0.5), default (0), SceneLinks (0.25), CachedTerrain (0.5),
EffectComposer render (1), CaptureExport (2). Keep the JSX order in `SceneCanvas` when adding layers.
