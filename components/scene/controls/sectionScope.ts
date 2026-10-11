// Per-section Leva folders (dev only): hidden inputs mirror the open section (and on Travel, whether a trip is
// open) and each folder's `render` reads them, so the panel lists only the layers the view shows. Folder settings
// are taken from the first useControls call that names the folder; later calls into the same folder inherit them.
import {levaStore, useControls} from 'leva';
import {useEffect} from 'react';
import {useTravelScene} from '@/components/travel/TravelSceneContext';
import type {SectionId} from '@/data/sections';

const SECTION = 'section';
const TRAVEL_TRIP = 'travelTrip';

type FolderScope = {render: (get: (path: string) => unknown) => boolean};

/** Registers the hidden inputs and keeps the section at the open one (`null` is the overview). */
export function useSectionScope(activeId: SectionId | null) {
  const section = activeId ?? 'overview';
  const [, set] = useControls(() => ({
    [SECTION]: {value: section, render: () => false},
    [TRAVEL_TRIP]: {value: false, render: () => false},
  }));
  useEffect(() => set({[SECTION]: section}), [section, set]);
}

/** Keeps the hidden trip input at whether a Travel trip is open. A leaf inside the canvas, so a hover or capture
 * re-renders only it. */
export function TravelTripScope() {
  const tripOpen = useTravelScene().selectedId !== null;
  useEffect(() => levaStore.set({[TRAVEL_TRIP]: tripOpen}, false), [tripOpen]);
  return null;
}

/** Folders for the landscape and homepage layers; About and Travel show only their own folders and Config. */
export const HOME_SCENE_FOLDER: FolderScope = {
  render: (get) => get(SECTION) !== 'about' && get(SECTION) !== 'travel',
};

/** Folders for About's own layers. */
export const ABOUT_FOLDER: FolderScope = {render: (get) => get(SECTION) === 'about'};

/** Folders for Travel's globe as both views draw it. */
export const TRAVEL_FOLDER: FolderScope = {render: (get) => get(SECTION) === 'travel'};

/** Folders for Travel's all-trips view only. */
export const TRAVEL_OVERVIEW_FOLDER: FolderScope = {
  render: (get) => get(SECTION) === 'travel' && get(TRAVEL_TRIP) !== true,
};

/** Folders for a selected Travel trip only. */
export const TRAVEL_TRIP_FOLDER: FolderScope = {
  render: (get) => get(SECTION) === 'travel' && get(TRAVEL_TRIP) === true,
};
