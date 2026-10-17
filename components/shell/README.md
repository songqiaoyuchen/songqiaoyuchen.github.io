# components/shell

The shell that stays mounted across `/`, `/about`, `/blog`, `/projects`, `/artworks/*` and `/places/*` (via `app/(scene)/layout.tsx`).

| File | Purpose |
| --- | --- |
| `SceneShell.tsx` | Lays out the scene, homepage hero/drawer/preloader and the Art or Places route content; every section follows the route |
| `AboutEntrySync.tsx` | Applies `?entry=` from the URL the page loaded with, so a direct About link opens at that entry |
| `useSceneLoading.ts` | Loading state machine: loading → exiting (the intro's cover on first arrival at the overview, completed when it has lifted; elsewhere a fade) → ready, or fallback; progress and bypass |
| `DevPanels.tsx` | Leva panels in development (scene controls on Home, "Art Camera" on Art) |
| `TerrainFallback.tsx` / `.css` | Static CSS contour backdrop when WebGL fails or is skipped |
