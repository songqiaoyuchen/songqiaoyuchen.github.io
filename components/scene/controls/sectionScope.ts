// Per-section Leva folders (dev only): hidden inputs mirror the open section (and on Places, whether a location is
// open) and each folder's `render` reads them, so the panel lists only the layers the view shows. Folder settings
// are taken from the first useControls call that names the folder; later calls into the same folder inherit them.
import {levaStore, useControls} from 'leva';
import {useEffect} from 'react';
import {usePlacesScene} from '@/components/places/PlacesSceneContext';
import type {SectionId} from '@/data/sections';

const SECTION = 'section';
const PLACES_LOCATION = 'placesLocation';

type FolderScope = {render: (get: (path: string) => unknown) => boolean};

/** Registers the hidden inputs and keeps the section at the open one (`null` is the overview). */
export function useSectionScope(activeId: SectionId | null) {
  const section = activeId ?? 'overview';
  const [, set] = useControls(() => ({
    [SECTION]: {value: section, render: () => false},
    [PLACES_LOCATION]: {value: false, render: () => false},
  }));
  // Production has no panel to scope; the store write would only re-render the canvas at every section change.
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') set({[SECTION]: section});
  }, [section, set]);
}

/** Keeps the hidden location input at whether a Places location is open. A leaf inside the canvas, so a hover or
 * capture re-renders only it. */
export function PlacesLocationScope() {
  const locationOpen = usePlacesScene().selectedId !== null;
  useEffect(() => levaStore.set({[PLACES_LOCATION]: locationOpen}, false), [locationOpen]);
  return null;
}

/** Folders for the landscape and homepage layers; About and Places show only their own folders and Config. */
export const HOME_SCENE_FOLDER: FolderScope = {
  render: (get) => get(SECTION) !== 'about' && get(SECTION) !== 'places',
};

/** Folders for About's own layers. */
export const ABOUT_FOLDER: FolderScope = {render: (get) => get(SECTION) === 'about'};

/** Folders for Places's globe as both views draw it. */
export const PLACES_FOLDER: FolderScope = {render: (get) => get(SECTION) === 'places'};

/** Folders for Places's all-locations view only. */
export const PLACES_OVERVIEW_FOLDER: FolderScope = {
  render: (get) => get(SECTION) === 'places' && get(PLACES_LOCATION) !== true,
};

/** Folders for a selected Places location only. */
export const PLACES_LOCATION_FOLDER: FolderScope = {
  render: (get) => get(SECTION) === 'places' && get(PLACES_LOCATION) === true,
};
