# components/shell

The shell that stays mounted across `/` and `/artworks/*` (via `app/(scene)/layout.tsx`).

| File | Purpose |
| --- | --- |
| `SceneShell.tsx` | Lays out the scene, homepage hero/drawer/preloader and the Art route content |
| `useSceneLoading.ts` | Loading state machine: loading → exiting → ready, or fallback; progress and bypass |
| `DevPanels.tsx` | Leva panels in development (scene controls on Home, "Art Camera" on Art) |
| `TerrainFallback.tsx` / `.css` | Static CSS contour backdrop when WebGL fails or is skipped |
