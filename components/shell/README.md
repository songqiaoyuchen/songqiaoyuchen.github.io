# components/shell

The shell that stays mounted across `/`, `/about`, `/blog`, `/projects`, `/artworks/*` and `/travel/*` (via `app/(scene)/layout.tsx`).

| File | Purpose |
| --- | --- |
| `SceneShell.tsx` | Lays out the scene, homepage hero/drawer/preloader and the Art or Travel route content; every section follows the route |
| `AboutEntrySync.tsx` | Applies `?entry=` from the URL the page loaded with, so a direct About link opens at that entry |
| `useSceneLoading.ts` | Loading state machine: loading → exiting → ready, or fallback; progress and bypass |
| `DevPanels.tsx` | Leva panels in development (scene controls on Home, "Art Camera" on Art) |
| `TerrainFallback.tsx` / `.css` | Static CSS contour backdrop when WebGL fails or is skipped |
