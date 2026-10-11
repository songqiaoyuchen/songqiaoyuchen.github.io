# components/travel

The Travel section's HTML (`/travel`, `/travel/[trip]`), mounted by `app/(scene)/travel/layout.tsx` over the
globe drawn by `components/scene/travel`.

| File | Purpose |
| --- | --- |
| `TravelSection.tsx` | Reads the route, shows the index or the trip panel, the photo viewer; arrow and Escape keys |
| `TravelSceneContext.tsx` | Selected (from the URL), hovered and captured trip (state, read by the globe and camera inside the canvas) and the stable setters, globe outline and the place the globe faces (actions, passed on by `SceneShell`) |
| `useTravelRoute.ts` | The selected trip (`useRouteTrip`) and open photo from the URL |
| `TripIndex.tsx` | Overview list of trips west to east with coordinates, under the meridian strip, as a right-hand drawer styled like the home drawers; hover highlights the marker, the trip in the globe's focus lights up, trips on the far side dim |
| `MeridianStrip.tsx` | The globe's turn laid flat: a small world map with every trip as a diamond, N and S marked, the facing half shaded and a crosshair at the globe's centre, following the globe every frame |
| `TripPanel.tsx` | A trip's meta, title, place, text, optional photos and story link, "All trips" return |
| `PhotoViewer.tsx` | Modal photo viewer with previous/next (`?photo=`) |
| `Travel.css` | Layout, index drawer frame, type, phone sheet, viewer and arrival gating |
