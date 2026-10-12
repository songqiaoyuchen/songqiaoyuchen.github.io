# scripts/assets

| File | Purpose |
| --- | --- |
| `sync-artwork-dimensions.mjs` | `npm run sync:artwork-dimensions`: writes image sizes into `data/artworks.ts` |
| `sync-travel-photos.mjs` | `npm run sync:travel-photos` (also before `dev` and `build`): reads the gallery folders under `public/travel/photos/<trip>/<gallery>/` (images in file-name order, a same-named `.txt` as each photo's text) into `data/travelPhotos.json` |
| `imageDimensions.mjs` | Image size from the file header (PNG, JPEG with EXIF orientation, GIF, WebP), shared by the sync scripts |
| `generate_font_atlas.py` | Builds the SDF glyph atlas for scene text (`stream-atlas.png`) |
| `generate_glyph_rain_atlas.py` | Builds the bitmap glyph atlas for the glyph rain (`decorative-atlas.png`) |
| `capture-pencil-source.mjs` | Captures the bare terrain at the Art pose as a source for backdrop paintings |
| `register-illustration.mjs` | Measures (and with `--apply` corrects) a backdrop painting's drift from that capture |
| `build-travel-geo.mjs` | `coast <geojson…>` bakes coastlines and lakes to `public/travel/coast.bin`; `elevation <image>` resizes a grayscale topography image to `public/travel/elevation.png`; `region <lon> <lat>` fetches Terrarium tiles (AWS Open Data, attribution required) into `public/travel/region.png` + `region.json`; `track <id> <gpx…>` simplifies recordings to track JSON |
