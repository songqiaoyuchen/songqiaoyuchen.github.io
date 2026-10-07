# app/(scene)

Route group for `/`, `/about` and `/artworks/*`. Its layout keeps one `SceneShell` (scene, preloader, drawer)
mounted while moving between Home, About and Art, so the WebGL canvas survives the navigation.

| File / folder | Purpose |
| --- | --- |
| `layout.tsx` | Wraps children in `ArtSceneProvider` + `SceneShell`; passes the three latest articles |
| `page.tsx` | `/` — renders nothing; the layout draws the homepage |
| `about/page.tsx` | `/about` — metadata only; the shell opens the About drawer (`?entry=` deep-links an entry) |
| `artworks/` | Art routes |
