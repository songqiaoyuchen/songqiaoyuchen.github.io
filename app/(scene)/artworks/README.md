# app/(scene)/artworks

Art routes. The layout mounts `ArtSection` once; each page only supplies metadata (and static params),
and `ArtSection` reads the URL to decide what to show.

| File / folder | Purpose |
| --- | --- |
| `layout.tsx` | Mounts `ArtSection` and imports every Art stylesheet in cascade order |
| `page.tsx` | `/artworks` — Selected works carousel |
| `all/page.tsx` | `/artworks/all` — All works collection |
| `[id]/page.tsx` | `/artworks/[id]` — inspection dialog; one static page per artwork |
