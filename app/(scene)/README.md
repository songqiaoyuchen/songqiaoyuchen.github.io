# app/(scene)

Route group for `/` and `/artworks/*`. Its layout keeps one `SceneShell` (scene, preloader, drawer)
mounted while moving between Home and Art, so the WebGL canvas survives the navigation.

| File / folder | Purpose |
| --- | --- |
| `layout.tsx` | Wraps children in `ArtSceneProvider` + `SceneShell`; passes the three latest articles |
| `page.tsx` | `/` — renders nothing; the layout draws the homepage |
| `artworks/` | Art routes |
