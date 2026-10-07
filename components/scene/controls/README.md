# components/scene/controls

Leva tuning panels, visible in development only (in production every value is its config default).
Each control is commented with the file it affects. Save buttons post to `app/api/dev-config`, which
writes the values back into `config/`.

| File | Leva folder | Saves to |
| --- | --- | --- |
| `useSceneControls.ts` | All homepage folders, in panel order | — |
| `useTerrainControls.ts` | Terrain, Point Light 1, Point Light 2 | `config/scene/terrain.ts` |
| `useContourControls.ts` | Contour Lines | `config/scene/contours.ts` |
| `useFogControls.ts` | Fog | `config/scene/fog.ts` |
| `usePostControls.ts` | Post | `config/scene/postProcessing.ts` |
| `useSceneLinkControls.ts` | Mobile Scene Links | `config/scene/sceneLinks.ts` |
| `useGlyphRainControls.ts` | Glyph Rain | `config/scene/glyphRain.ts` |
| `useAboutPathControls.ts` | About Path | `config/scene/aboutPath.ts` |
| `SaveConfigButton.tsx` | Config › Save Config | all of the above |
| `SaveCameraButton.tsx` | Config › Save Camera | `config/scene/camera.ts` |
| `ArtCameraControls.tsx` | Art Camera (Art only) | `config/scene/camera.ts` |
| `ArtTransitionControls.tsx` | Art Transition | `camera.ts`, `config/art/backdrop.ts`, `fog.ts` |
| `ArtCursorControls.tsx` | Art Cursor | `config/art/cursor.ts` |
| `saveConfig.ts` | — | POST helper |
