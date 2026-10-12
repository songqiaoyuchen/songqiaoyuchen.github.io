// Travel section (/travel, /travel/[trip]): the trip index beside the globe, the selected trip's panel and the
// photo viewer. The globe itself is the scene (components/scene/travel); this layer shares its state through
// TravelSceneContext and only takes pointer events on its own text; on phones the text is a sheet under the whole
// globe, peeking with the trip in focus, its list pulled up over it (the camera steps back) or a trip. The globe
// answers a change of view at once; the text follows it: the old content fades out first (VIEW_EXIT_MS), then the
// new one rises as the camera lands on a trip, or as the globe settles back to all trips (Travel.css).
'use client';

import {useRouter} from 'next/navigation';
import {Suspense, useEffect, useRef, useState} from 'react';
import {QuerySync} from '@/components/art/QuerySync';
import {TRIPS} from '@/data/travel';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {PhotoViewer} from './PhotoViewer';
import {useTravelScene, useTravelSceneActions} from './TravelSceneContext';
import {useTripSheetPlacement} from './useTripSheetPlacement';
import {TripIndex} from './TripIndex';
import {TripPanel} from './TripPanel';
import {useTravelRoute} from './useTravelRoute';

// Travel.css --travel-exit.
const VIEW_EXIT_MS = 240;

export function TravelSection() {
  const [queryString, setQueryString] = useState('');
  const {trip, gallery, photos, photo, tripHref} = useTravelRoute(queryString);
  const router = useRouter();
  const {hoveredId, capturedId, indexOpen} = useTravelScene();
  const {setHoveredId, setIndexOpen, globeOutline, globeFront} = useTravelSceneActions();
  const reducedMotion = useReducedMotion();
  // The view the text shows: the route's, once the old content has faded out.
  const [shownTrip, setShownTrip] = useState(trip);
  const exiting = shownTrip?.id !== trip?.id;
  useEffect(() => {
    if (!exiting) return;
    const timer = window.setTimeout(() => setShownTrip(trip), reducedMotion ? 0 : VIEW_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [exiting, reducedMotion, trip]);
  // The trip panel keeps clear of the globe as drawn: its text flows around a float shaped like the globe.
  const sheetRef = useRef<HTMLDivElement>(null);
  const shapeRef = useRef<HTMLDivElement>(null);
  useTripSheetPlacement(sheetRef, shapeRef, globeOutline, Boolean(shownTrip));
  // Phones: a trip opened from the list replaces it; back to all trips the sheet peeks again. Leaving Travel lets
  // it down too, so the camera's next Travel pose is all trips.
  useEffect(() => {
    if (trip) setIndexOpen(false);
  }, [setIndexOpen, trip]);
  useEffect(() => () => setIndexOpen(false), [setIndexOpen]);

  // Arrows step through the trips oldest to newest; Escape returns to the overview.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const field = event.target instanceof Element && event.target.closest('input, textarea, [contenteditable]');
      if (field || photo >= 0) return;
      if (event.key === 'Escape' && trip) {
        router.push('/travel');
        event.preventDefault();
        return;
      }
      if (event.key === 'Escape' && indexOpen) {
        setIndexOpen(false);
        event.preventDefault();
        return;
      }
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const current = TRIPS.findIndex((candidate) => candidate.id === (trip?.id ?? capturedId));
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const next = current < 0
        ? (step > 0 ? 0 : TRIPS.length - 1)
        : (current + step + TRIPS.length) % TRIPS.length;
      router.push(`/travel/${TRIPS[next].id}`);
      event.preventDefault();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [capturedId, indexOpen, photo, router, setIndexOpen, trip]);

  return (
    <>
      <Suspense>
        <QuerySync onChange={setQueryString} />
      </Suspense>
      <main
        className="travel-section"
        data-exiting={exiting || undefined}
        data-index-open={(indexOpen && !shownTrip) || undefined}
        data-view={shownTrip ? 'trip' : 'overview'}
      >
        <h1 className="sr-only">Travel</h1>
        <div className="travel-sheet" ref={sheetRef}>
          {shownTrip ? (
            <>
              <div aria-hidden="true" className="travel-globe-shape" ref={shapeRef} />
              <TripPanel trip={shownTrip} />
            </>
          ) : (
            <TripIndex
              capturedId={capturedId}
              globeFront={globeFront}
              hoveredId={hoveredId}
              onHover={setHoveredId}
              onOpenChange={setIndexOpen}
              open={indexOpen}
              trips={TRIPS}
            />
          )}
        </div>
      </main>
      {gallery && photo >= 0 ? (
        <PhotoViewer
          gallery={gallery}
          index={photo}
          photos={photos}
          onClose={() => router.replace(tripHref, {scroll: false})}
          tripHref={tripHref}
        />
      ) : null}
    </>
  );
}
