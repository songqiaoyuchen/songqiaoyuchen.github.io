# components/travel

The Travel section's HTML (`/travel`, `/travel/[trip]`), mounted by `app/(scene)/travel/layout.tsx` over the
globe drawn by `components/scene/travel`.

| File | Purpose |
| --- | --- |
| `TravelSection.tsx` | Reads the route, shows the index or the trip panel, the photo viewer; arrow and Escape keys |
| `TravelSceneContext.tsx` | Selected (from the URL), hovered and captured trip, the phone list pulled up (state, read by the globe and camera inside the canvas) and the stable setters, globe outline and the place the globe faces (actions, passed on by `SceneShell`) |
| `useTravelRoute.ts` | The selected trip (`useRouteTrip`) and the open gallery photo from the URL |
| `TripIndex.tsx` | Overview list of trips west to east with coordinates, under the meridian strip, as a right-hand drawer styled like the home drawers; on phones a peek sheet (the trip in focus, a bar pulling the list up); hover highlights the marker, the trip in the globe's focus lights up, trips on the far side dim |
| `MeridianStrip.tsx` | The globe's turn laid flat: a small world map with every trip as a diamond, N and S marked, the facing half shaded and a crosshair at the globe's centre, following the globe every frame |
| `TripPanel.tsx` | A trip's meta, title, place, text, optional galleries (title, photo count, a strip of thumbnails with a gap between days) and stories, "All trips" return |
| `PhotoViewer.tsx` / `.css` | Full-page gallery (`?gallery=&photo=`): the photos in one sliding row, the current one large and its neighbours dim, after Art's selected works; caption (date, place, description) and a day-grouped ruler |
| `usePhotoTrack.ts` | The viewer's spring position (layout in `lib/travel/photoTrack.ts`, numbers in `config/travel/photoViewer.ts`): drag with flick, wheel, keys; steps replace `?photo=` |
| `Travel.css` | Layout, index drawer frame, type, phone peek sheet, gallery strip and arrival gating |
