# components/travel

The Travel section's HTML (`/travel`, `/travel/[trip]`), mounted by `app/(scene)/travel/layout.tsx` over the
globe drawn by `components/scene/travel`.

| File | Purpose |
| --- | --- |
| `TravelSection.tsx` | Reads the route, shows the index or the trip panel, the photo viewer; arrow and Escape keys |
| `TravelSceneContext.tsx` | Selected, hovered and captured trip (state, read by the globe and camera inside the canvas) and the stable setters and globe outline (actions, passed on by `SceneShell`) |
| `useTravelRoute.ts` | The selected trip and open photo from the URL |
| `TripIndex.tsx` | Overview list of trips, newest first; hover highlights the marker, the captured trip is marked |
| `TripPanel.tsx` | A trip's meta, title, place, text, optional photos and story link, "All trips" return |
| `PhotoViewer.tsx` | Modal photo viewer with previous/next (`?photo=`) |
| `Travel.css` | Layout, type, phone sheet, viewer and arrival gating |
