# components/home/drawer

Preview drawer that slides in beside the scene when a scene link (ABOUT, BLOG, PROJECTS) is clicked.

| File / folder | Purpose |
| --- | --- |
| `Drawer.tsx` | Drawer frame: backdrop, lazy panel, close button, Escape to close |
| `Drawer.styles.ts` | Tailwind classes for the frame (`drawerStyles`) and shared panel parts (`panelStyles`) |
| `Drawer.css` | `preview-backdrop` and `about-bottom-reveal` utilities |
| `usePanelScrollEdges.ts` | Sets `data-at-start` / `data-at-end` on a panel while it scrolls |
| `about/` | About panel |
| `blog/` | Blog panel |
| `projects/` | Projects panel |
