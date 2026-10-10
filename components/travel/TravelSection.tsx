// Travel section (/travel, /travel/[trip]): the trip index beside the globe, the selected trip's panel and the
// photo viewer. The globe itself is the scene (components/scene/travel); this layer shares its state through
// TravelSceneContext and only takes pointer events on its own text.
'use client';

import {useRouter} from 'next/navigation';
import {Suspense, useEffect, useRef, useState} from 'react';
import {QuerySync} from '@/components/art/QuerySync';
import {TRIPS} from '@/data/travel';
import {PhotoViewer} from './PhotoViewer';
import {useTravelScene} from './TravelSceneContext';
import {useTripSheetPlacement} from './useTripSheetPlacement';
import {TripIndex} from './TripIndex';
import {TripPanel} from './TripPanel';
import {useTravelRoute} from './useTravelRoute';

export function TravelSection() {
  const [queryString, setQueryString] = useState('');
  const {trip, photo, tripHref} = useTravelRoute(queryString);
  const router = useRouter();
  const {setSelectedId, hoveredId, setHoveredId, capturedId, globeOutline} = useTravelScene();
  // The trip panel keeps clear of the globe as drawn: its text flows around a float shaped like the globe.
  const sheetRef = useRef<HTMLDivElement>(null);
  const shapeRef = useRef<HTMLDivElement>(null);
  useTripSheetPlacement(sheetRef, shapeRef, globeOutline, Boolean(trip));

  // The route is the selection; leaving Travel clears it.
  useEffect(() => {
    setSelectedId(trip?.id ?? null);
  }, [setSelectedId, trip]);
  useEffect(() => () => setSelectedId(null), [setSelectedId]);

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
  }, [capturedId, photo, router, trip]);

  return (
    <>
      <Suspense>
        <QuerySync onChange={setQueryString} />
      </Suspense>
      <main className="travel-section" data-view={trip ? 'trip' : 'overview'}>
        <h1 className="sr-only">Travel</h1>
        <div className="travel-sheet" ref={sheetRef}>
          {trip ? (
            <>
              <div aria-hidden="true" className="travel-globe-shape" ref={shapeRef} />
              <TripPanel trip={trip} />
            </>
          ) : (
            <TripIndex capturedId={capturedId} hoveredId={hoveredId} onHover={setHoveredId} trips={TRIPS} />
          )}
        </div>
      </main>
      {trip && photo >= 0 ? (
        <PhotoViewer
          index={photo}
          onClose={() => router.replace(tripHref, {scroll: false})}
          trip={trip}
          tripHref={tripHref}
        />
      ) : null}
    </>
  );
}
