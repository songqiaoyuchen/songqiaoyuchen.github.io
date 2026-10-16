# app/(scene)

Route group for `/`, `/about`, `/blog`, `/projects`, `/artworks/*` and `/places/*`. Its layout keeps one `SceneShell` (scene,
preloader, drawer) mounted while moving between Home, About, Art and Places, so the WebGL canvas survives
the navigation.

| File / folder | Purpose |
| --- | --- |
| `layout.tsx` | Wraps children in `ArtSceneProvider`, `PlacesSceneProvider` + `SceneShell`; passes the three latest articles |
| `page.tsx` | `/` — renders nothing; the layout draws the homepage |
| `about/page.tsx` | `/about` — metadata only; the shell opens the About drawer (`?entry=` deep-links an entry) |
| `blog/page.tsx`, `projects/page.tsx` | `/blog`, `/projects` — metadata only; the shell opens that drawer (archives: `app/blog/all`, `app/projects/all`) |
| `artworks/` | Art routes |
| `places/` | Places routes: `layout.tsx` mounts `PlacesSection`; `page.tsx` is the globe overview, `[location]/page.tsx` a selected location (`?photo=` opens the viewer) |
