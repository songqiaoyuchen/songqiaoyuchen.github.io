// Places section (/places, /places/[location]): the location index beside the globe, the selected location's panel and
// the photo viewer. The globe itself is the scene (components/scene/places); this layer shares its state through
// PlacesSceneContext and only takes pointer events on its own text; on phones the text is a sheet under the whole
// globe, peeking with the location in focus, its list pulled up over it (the camera steps back) or a location. The
// globe answers a change of view at once; the text follows it: the old content fades out first (VIEW_EXIT_MS), then the
// new one rises as the camera lands on a location, or as the globe settles back to all locations (Places.css).
'use client';

import {useRouter} from 'next/navigation';
import {Suspense, useEffect, useRef, useState, type CSSProperties} from 'react';
import {QuerySync} from '@/components/art/QuerySync';
import {SectionClose} from '@/components/site/SectionClose';
import {CAMERA_JOURNEY_CONFIG} from '@/config/scene/camera';
import {LOCATIONS} from '@/data/places';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {PhotoViewer} from './PhotoViewer';
import {usePlacesScene, usePlacesSceneActions} from './PlacesSceneContext';
import {useLocationSheetPlacement} from './useLocationSheetPlacement';
import {LocationIndex} from './LocationIndex';
import {LocationPanel} from './LocationPanel';
import {usePlacesRoute} from './usePlacesRoute';

// Places.css --places-exit.
const VIEW_EXIT_MS = 240;
// Phones: the sheet rises and falls with the camera's step back and forward as the location list opens and closes.
const SECTION_STYLE = {'--places-sheet-move': `${CAMERA_JOURNEY_CONFIG.placesIndex * 1000}ms`} as CSSProperties;

export function PlacesSection() {
  const [queryString, setQueryString] = useState('');
  const {location, gallery, photos, photo, locationHref} = usePlacesRoute(queryString);
  const router = useRouter();
  const {hoveredId, capturedId, indexOpen} = usePlacesScene();
  const {setHoveredId, setIndexOpen, globeOutline, globeFront} = usePlacesSceneActions();
  const reducedMotion = useReducedMotion();
  // The view the text shows: the route's, once the old content has faded out.
  const [shownLocation, setShownLocation] = useState(location);
  const exiting = shownLocation?.id !== location?.id;
  useEffect(() => {
    if (!exiting) return;
    const timer = window.setTimeout(() => setShownLocation(location), reducedMotion ? 0 : VIEW_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [exiting, reducedMotion, location]);
  // The location panel keeps clear of the globe as drawn: its text flows around a float shaped like the globe.
  const sheetRef = useRef<HTMLDivElement>(null);
  const shapeRef = useRef<HTMLDivElement>(null);
  useLocationSheetPlacement(sheetRef, shapeRef, globeOutline, Boolean(shownLocation));
  // Phones: a location opened from the list replaces it; back to all locations the sheet peeks again. Leaving Places
  // lets it down too, so the camera's next Places pose is all locations.
  useEffect(() => {
    if (location) setIndexOpen(false);
  }, [setIndexOpen, location]);
  useEffect(() => () => setIndexOpen(false), [setIndexOpen]);

  // Arrows step through the locations oldest to newest; Escape returns to the overview.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const field = event.target instanceof Element && event.target.closest('input, textarea, [contenteditable]');
      if (field || photo >= 0) return;
      if (event.key === 'Escape' && location) {
        router.push('/places');
        event.preventDefault();
        return;
      }
      if (event.key === 'Escape' && indexOpen) {
        setIndexOpen(false);
        event.preventDefault();
        return;
      }
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const current = LOCATIONS.findIndex((candidate) => candidate.id === (location?.id ?? capturedId));
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const next = current < 0
        ? (step > 0 ? 0 : LOCATIONS.length - 1)
        : (current + step + LOCATIONS.length) % LOCATIONS.length;
      router.push(`/places/${LOCATIONS[next].id}`);
      event.preventDefault();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [capturedId, indexOpen, photo, router, setIndexOpen, location]);

  return (
    <>
      <Suspense>
        <QuerySync onChange={setQueryString} />
      </Suspense>
      <main
        className="places-section"
        style={SECTION_STYLE}
        data-exiting={exiting || undefined}
        data-index-open={(indexOpen && !shownLocation) || undefined}
        data-view={shownLocation ? 'location' : 'overview'}
      >
        <h1 className="sr-only">Places</h1>
        {shownLocation ? null : <SectionClose className="places-close" label="Places" />}
        <div className="places-sheet" ref={sheetRef}>
          {shownLocation ? (
            <>
              {/* With a location open the × sits on the panel's first row, beside All places, scrolling with it. */}
              <SectionClose className="places-close" label="Places" />
              <div aria-hidden="true" className="places-globe-shape" ref={shapeRef} />
              <LocationPanel location={shownLocation} />
            </>
          ) : (
            <LocationIndex
              capturedId={capturedId}
              globeFront={globeFront}
              hoveredId={hoveredId}
              onHover={setHoveredId}
              onOpenChange={setIndexOpen}
              open={indexOpen}
              locations={LOCATIONS}
            />
          )}
        </div>
      </main>
      {gallery && photo >= 0 ? (
        <PhotoViewer
          gallery={gallery}
          index={photo}
          photos={photos}
          onClose={() => router.replace(locationHref, {scroll: false})}
          locationHref={locationHref}
        />
      ) : null}
    </>
  );
}
