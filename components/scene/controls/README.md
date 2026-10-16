# components/scene/controls

Leva tuning panels, visible in development only (in production every value is its config default).
Each control is commented with the file it affects. Save buttons post to `app/api/dev-config`, which
writes the values back into `config/`. Leva registers a button once, so a button handler must read live
values through a ref (`latest.current`), never from its closure.

| File | Leva folder | Saves to |
| --- | --- | --- |
| `useSceneControls.ts` | All homepage folders, in panel order | — |
| `sectionScope.ts` | Shows folders per section (About: only About Path and Config): a hidden `section` input read by folder `render` settings | — |
| `useTerrainControls.ts` | Terrain, Point Light 1, Point Light 2 (not on About) | `config/scene/terrain.ts` |
| `useContourControls.ts` | Contour Lines (not on About) | `config/scene/contours.ts` |
| `useFogControls.ts` | Fog (not on About) | `config/scene/fog.ts` |
| `usePostControls.ts` | Post (not on About) | `config/scene/postProcessing.ts` |
| `useSceneLinkControls.ts` | Mobile Scene Links (not on About) | `config/scene/sceneLinks.ts` |
| `useGlyphRainControls.ts` | Glyph Rain (not on About) | `config/scene/glyphRain.ts` |
| `useAboutPathControls.ts` | About Path (About only; checkpoints are hidden, edited in the scene); `about/AboutPathEditor.tsx` adds Edit route, Remove anchor, Reset and Save route | `config/scene/aboutPath.ts` |
| `useCameraJourneyControls.ts` | Camera Journeys (every section): each camera journey's duration but Art's | `config/scene/camera.ts` (`CAMERA_JOURNEY_CONFIG`) |
| `SaveConfigButton.tsx` | Config › Save Config | all of the above |
| `SaveCameraButton.tsx` | Config › Save Camera | `config/scene/camera.ts` |
| `ArtCameraControls.tsx` | Art Camera (Art only) | `config/scene/camera.ts` |
| `ArtTransitionControls.tsx` | Art Transition (Art's camera journey, wipe, flight fog) | `camera.ts`, `config/art/backdrop.ts`, `fog.ts` |
| `ArtCursorControls.tsx` | Art Cursor | `config/art/cursor.ts` |
| `saveConfig.ts` | — | POST helper |
