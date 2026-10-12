# components/home/drawer

Preview drawer that slides in beside the scene on the `/about`, `/blog` and `/projects` routes (scene links and nav open them).
Blog and Projects open on the left; About opens on the right of its terrain path, wider, with its own column padding.

| File / folder | Purpose |
| --- | --- |
| `Drawer.tsx` | Drawer frame: backdrop, lazy panel, close button, Escape to close |
| `Drawer.styles.ts` | Tailwind classes for the frame (`drawerStyles`) and shared panel parts (`panelStyles`) |
| `Drawer.css` | `preview-backdrop`, `about-backdrop` and `about-bottom-reveal` utilities |
| `usePanelScrollEdges.ts` | Sets `data-at-start` / `data-at-end` on a panel while it scrolls |
| `about/` | About panel: intro, scroll-driven experience timeline (drives the terrain path), contact |
| `blog/` | Blog panel |
| `projects/` | Projects panel |
