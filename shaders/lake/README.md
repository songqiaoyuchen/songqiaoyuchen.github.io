# shaders/lake

| File | Used by | Purpose |
| --- | --- | --- |
| `lake.vert` / `lake.frag` | `LakeSurface` | The water surface: cut to a noise-moved shore, dark still water with a gold shoreline where the ground meets it, a cyan sheen and rings on hover, stilling to black as the dive begins; terrain-depth occlusion |
| `crackGlow.frag` | `LakeDive` | The walls as the bloom pass draws them: only each ping's front and the lit depth lines, no grain or shading, so the second draw costs a fraction of the first |
| `crack.vert` / `crack.frag` | `LakeDive` | Sonar imaging of the crack's walls: black water, each ping's front travelling out and lighting the walls as it passes (by how squarely they face it, depth lines in gold, the front in cyan), the afterimage decaying behind it, returns weakening with distance. The scanned rock (`public/textures/lake`) is laid on triplanar: its height map pushes the vertices (`crack.vert`), its normal map tilts the shading and its occlusion and height darken the crevices (`crack.frag`) |
