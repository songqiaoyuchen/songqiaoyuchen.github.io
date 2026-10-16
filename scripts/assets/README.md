# scripts/assets

| File | Purpose |
| --- | --- |
| `sync-artwork-dimensions.mjs` | `npm run sync:artwork-dimensions`: writes image sizes into `data/artworks.ts` |
| `import-places-photos.mjs` | `npm run import:places-photos [-- --force]`: converts originals (HEIC, JPEG, PNG…) in the git-ignored `photos-src/<location>/<gallery>/` to WebP in `public/places/photos/<location>/<gallery>/`, named for when each was taken (`2026-05-14_164438.webp`, from the camera or a date leading the original's name; undated originals are skipped) (2400px long edge, plus a 480px copy in `thumbs/`), sRGB with all metadata (GPS included) stripped; adds each new photo to the gallery's `photos.json` with its camera date, and fills empty locations from the original's GPS via Nominatim reverse geocoding (1 request/s, cached in `photos-src/geocode-cache.json`; written locations are kept), sorts each `photos.json` by file name (time taken), then runs the sync. Skips photos already imported |
| `sync-places-photos.mjs` | `npm run sync:places-photos` (also before `dev`; `--strict` before `build`): reads the gallery folders under `public/places/photos/<location>/<gallery>/` (WebP photos, `thumbs/`, and a `photos.json` giving each one's date, location, optional description and optional `order`; ordered by date, then file name; a photo with `order` (a number, lowest first) leads its gallery's thumbnail strip, while the gallery itself stays in date order) into `data/placesPhotos.json`. A photo without a date or location is left out with a warning; `--strict` fails instead |
| `imageDimensions.mjs` | Image size from the file header (PNG, JPEG with EXIF orientation, GIF, WebP), shared by the sync scripts |
| `generate_font_atlas.py` | Builds the SDF glyph atlas for scene text (`stream-atlas.png`) |
| `generate_glyph_rain_atlas.py` | Builds the bitmap glyph atlas for the glyph rain (`decorative-atlas.png`) |
| `capture-pencil-source.mjs` | Captures the bare terrain at the Art pose as a source for backdrop paintings |
| `register-illustration.mjs` | Measures (and with `--apply` corrects) a backdrop painting's drift from that capture |
| `build-places-geo.mjs` | `coast <geojson…>` bakes coastlines and lakes to `public/places/coast.bin`; `elevation <image>` resizes a grayscale topography image to `public/places/elevation.png`; `region <lon> <lat>` fetches Terrarium tiles (AWS Open Data, attribution required) into `public/places/region.png` + `region.json`; `track <id> <gpx…>` simplifies recordings to track JSON |
