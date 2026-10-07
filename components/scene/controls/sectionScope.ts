// Per-section Leva folders (dev only): a hidden `section` input mirrors the open section and each folder's
// `render` reads it, so the panel lists only the layers the section shows. Folder settings are taken from
// the first useControls call that names the folder; later calls into the same folder inherit them.
import {useControls} from 'leva';
import {useEffect} from 'react';
import type {SectionId} from '@/data/sections';

const SECTION = 'section';

type FolderScope = {render: (get: (path: string) => unknown) => boolean};

/** Registers the hidden section input and keeps it at the open section (`null` is the overview). */
export function useSectionScope(activeId: SectionId | null) {
  const section = activeId ?? 'overview';
  const [, set] = useControls(() => ({[SECTION]: {value: section, render: () => false}}));
  useEffect(() => set({[SECTION]: section}), [section, set]);
}

/** Folders for the landscape and homepage layers; About shows only its own folders and Config. */
export const HOME_SCENE_FOLDER: FolderScope = {render: (get) => get(SECTION) !== 'about'};

/** Folders for About's own layers. */
export const ABOUT_FOLDER: FolderScope = {render: (get) => get(SECTION) === 'about'};
