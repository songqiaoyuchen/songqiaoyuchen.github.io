# app/(scene)

Route group for `/`, `/about`, `/blog`, `/projects`, `/artworks/*` and `/travel/*`. Its layout keeps one `SceneShell` (scene,
preloader, drawer) mounted while moving between Home, About, Art and Travel, so the WebGL canvas survives
the navigation.

| File / folder | Purpose |
| --- | --- |
| `layout.tsx` | Wraps children in `ArtSceneProvider`, `TravelSceneProvider` + `SceneShell`; passes the three latest articles |
| `page.tsx` | `/` — renders nothing; the layout draws the homepage |
| `about/page.tsx` | `/about` — metadata only; the shell opens the About drawer (`?entry=` deep-links an entry) |
| `blog/page.tsx`, `projects/page.tsx` | `/blog`, `/projects` — metadata only; the shell opens that drawer (archives: `app/blog/all`, `app/projects/all`) |
| `artworks/` | Art routes |
| `travel/` | Travel routes: `layout.tsx` mounts `TravelSection`; `page.tsx` is the globe overview, `[trip]/page.tsx` a selected trip (`?photo=` opens the viewer) |
