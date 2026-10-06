# components/art

The Art section (`/artworks`, `/artworks/all`, `/artworks/[id]`). `ArtSection` is mounted once by the
artworks layout and reads the URL to decide the view. Behind it, the scene shows a **backdrop** — the
terrain re-rendered as oil, pencil or digital — matching the medium on screen.

| File / folder | Purpose |
| --- | --- |
| `ArtSection.tsx` | Orchestrator: route state, view switch, inspection, wiring of the hooks below |
| `ArtSection.css` | Page frame, terrain scrim, shared text links and focus rings, gallery grid |
| `ArtSceneContext.tsx` | State shared with the scene: requested backdrop and Screenshot mode |
| `useArtRoute.ts` | Parses the URL: view, selected work, inspected work, onward links |
| `QuerySync.tsx` | Mirrors the query string into state behind its own Suspense boundary |
| `useBackdropSync.ts` | Requests the backdrop for the visible medium once browsing pauses |
| `useInspectionReturn.ts` | Restores focus and scroll after closing an inspected work |
| `ScopeLink.tsx` / `.css` | "All works →" / "← Selected works" |
| `selected/` | Selected works carousel and its wall label |
| `all/` | All works collection and medium nav |
| `label/` | The museum-style wall label used by every view |
| `inspection/` | Full-screen artwork dialog |
| `transition/` | Animated switch between Selected and All works |
| `capture/` | Screenshot mode (development only) |

Tunables: `config/art/` (carousel, backdrop timing, gallery transition, cursor).
