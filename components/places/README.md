# components/places

The Places section's HTML (`/places`, `/places/[location]`), mounted by `app/(scene)/places/layout.tsx` over the
globe drawn by `components/scene/places`.

| File | Purpose |
| --- | --- |
| `PlacesSection.tsx` | Reads the route, shows the index or the location panel, the photo viewer; arrow and Escape keys |
| `PlacesSceneContext.tsx` | Selected (from the URL), hovered and captured location, the phone list pulled up (state, read by the globe and camera inside the canvas) and the stable setters, globe outline and the place the globe faces (actions, passed on by `SceneShell`) |
| `usePlacesRoute.ts` | The selected location (`useRouteLocation`) and the open gallery photo from the URL |
| `LocationIndex.tsx` | Overview list of locations west to east with coordinates, under the meridian strip, as a right-hand drawer styled like the home drawers; on phones a peek sheet (the location in focus, a bar pulling the list up); hover highlights the marker, the location in the globe's focus lights up, locations on the far side dim |
| `MeridianStrip.tsx` | The globe's turn laid flat: a small world map with every location as a diamond, N and S marked, the facing half shaded and a crosshair at the globe's centre, following the globe every frame |
| `LocationPanel.tsx` | A location's meta, title, place, text, optional galleries (title, photo count, a strip of thumbnails with a gap between days) and stories, "All locations" return |
| `PhotoViewer.tsx` / `.css` | Full-page gallery (`?gallery=&photo=`): the photos in one sliding row, the current one large and its neighbours dim, after Art's selected works; caption (date, place, description) and a day-grouped ruler |
| `usePhotoTrack.ts` | The viewer's spring position (layout in `lib/places/photoTrack.ts`, numbers in `config/places/photoViewer.ts`): drag with flick, wheel, keys; steps replace `?photo=` |
| `Places.css` | Layout, index drawer frame, type, phone peek sheet, gallery strip and arrival gating |
