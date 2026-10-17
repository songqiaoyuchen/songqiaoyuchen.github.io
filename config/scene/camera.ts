// Camera poses per section (written by Leva "Save Camera"/"Save Art View") and journey timing.
// Type-only imports keep this file loadable by the node scripts in scripts/test and scripts/verify.
import type {Vector3Tuple} from 'three';
import type {SectionId} from '@/data/sections';

export type CameraPose = Readonly<{
  lookAt: Vector3Tuple;
  position: Vector3Tuple;
}>;

export const CAMERA_CONFIG = {
  overviewPosition: [7.051, 13.416, -9.158] as Vector3Tuple,
  overviewLookAt: [3.368, 10.763, 3.04] as Vector3Tuple,
  mobileOverviewPosition: [-10.484, 13.33, -0.779] as Vector3Tuple,
  mobileOverviewLookAt: [2.503, 10.869, 0.89] as Vector3Tuple,
  projectsPosition: [6.294, 11.679, -5.879] as Vector3Tuple,
  projectsLookAt: [1.071, 10.028, 3.214] as Vector3Tuple,
  artPosition: [-0.922, 10.343, 7.177] as Vector3Tuple,
  artLookAt: [6.542, 8.98, 5.106] as Vector3Tuple,
  blogPosition: [3.397, 13.444, -6.564] as Vector3Tuple,
  blogLookAt: [1.071, 10.028, 3.214] as Vector3Tuple,
  aboutPosition: [5.822, 9.894, -6.385] as Vector3Tuple,
  aboutLookAt: [-3.397, 7.305, -2.975] as Vector3Tuple,
  // Phones: the whole route in the top of the screen, above the drawer, which starts at 40% of the height; each
  // entry is framed from here (ABOUT_PATH_CONFIG phoneFocus*).
  mobileAboutPosition: [8.781, 14.14, -13.918] as Vector3Tuple,
  mobileAboutLookAt: [0.142, 4.762, -1.8] as Vector3Tuple,
  // Places looks level at the globe (PLACES_CONFIG.center) from the overview's side of the terrain; the
  // globe sits left of centre on desktop, above centre on phones.
  placesPosition: [-5.334, 16.786, -14.985] as Vector3Tuple,
  placesLookAt: [-3.107, 17.258, 0.441] as Vector3Tuple,
  // A selected location (desktop): the globe lower left, the location's text to its right; the globe itself turns the
  // location to its marker point (PLACES_LOCATION_CONFIG.markerOffset).
  placesLocationPosition: [-0.821, 16.188, -4.573] as Vector3Tuple,
  placesLocationLookAt: [-3.736, 24.568, 5.012] as Vector3Tuple,
  // Phones (375 × 812 reference): the whole globe and its rings in the upper half, above the peek sheet; with the
  // location list pulled up, stepped back and higher, above the open sheet; a location, close in at the top of the
  // screen, the location turned to just above the sheet (PLACES_LOCATION_CONFIG.phoneMarkerOffset).
  mobilePlacesPosition: [0, 17, -29.5] as Vector3Tuple,
  mobilePlacesLookAt: [0, 15.17, 0] as Vector3Tuple,
  mobilePlacesIndexPosition: [0, 17, -44.4] as Vector3Tuple,
  mobilePlacesIndexLookAt: [0, 9.12, 0] as Vector3Tuple,
  mobilePlacesLocationPosition: [0, 17, -12.1] as Vector3Tuple,
  mobilePlacesLocationLookAt: [0, 14.27, 0] as Vector3Tuple,
  fov: 38,
} as const;

// Camera journey durations in seconds, one per journey kind (lib/scene/cameraJourney.ts legKind; CameraRig). The
// effects riding a journey (the Places morph, Art's flight fog, the globe's turn, the intro's lights) run over it,
// so they follow. Leva "Camera Journeys" (Art's in "Art Transition") writes them here.
export const CAMERA_JOURNEY_CONFIG = {
  default: 1.2, // between the overview, Projects and Blog
  art: 1.5, // into or out of Art
  aboutEntry: 1, // between the landscape and the About pose
  aboutFocus: 0.7, // between entries on the About path
  placesEntry: 2, // into or out of Places, the landscape shrinking to the globe
  placesFocus: 1.2, // between Places's overview and a location, either way
  placesIndex: 0.55, // phones: the location list pulled up or let down (sets Places.css --places-sheet-move)
} as const;

const CAMERA_POSES: Record<'overview' | SectionId, CameraPose> = {
  overview: {
    position: CAMERA_CONFIG.overviewPosition,
    lookAt: CAMERA_CONFIG.overviewLookAt,
  },
  projects: {
    position: CAMERA_CONFIG.projectsPosition,
    lookAt: CAMERA_CONFIG.projectsLookAt,
  },
  art: {
    position: CAMERA_CONFIG.artPosition,
    lookAt: CAMERA_CONFIG.artLookAt,
  },
  blog: {
    position: CAMERA_CONFIG.blogPosition,
    lookAt: CAMERA_CONFIG.blogLookAt,
  },
  about: {
    position: CAMERA_CONFIG.aboutPosition,
    lookAt: CAMERA_CONFIG.aboutLookAt,
  },
  places: {
    position: CAMERA_CONFIG.placesPosition,
    lookAt: CAMERA_CONFIG.placesLookAt,
  },
};

const MOBILE_OVERVIEW_POSE: CameraPose = {
  position: CAMERA_CONFIG.mobileOverviewPosition,
  lookAt: CAMERA_CONFIG.mobileOverviewLookAt,
};

const MOBILE_ABOUT_POSE: CameraPose = {
  position: CAMERA_CONFIG.mobileAboutPosition,
  lookAt: CAMERA_CONFIG.mobileAboutLookAt,
};

const MOBILE_PLACES_POSE: CameraPose = {
  position: CAMERA_CONFIG.mobilePlacesPosition,
  lookAt: CAMERA_CONFIG.mobilePlacesLookAt,
};

/** The camera framing a selected location. */
export function getPlacesLocationPose(isMobile = false): CameraPose {
  if (isMobile) {
    return {position: CAMERA_CONFIG.mobilePlacesLocationPosition, lookAt: CAMERA_CONFIG.mobilePlacesLocationLookAt};
  }
  return {position: CAMERA_CONFIG.placesLocationPosition, lookAt: CAMERA_CONFIG.placesLocationLookAt};
}

/** Phones only: all locations with the location list pulled up, the globe stepped back above it. */
export function getPlacesIndexPose(): CameraPose {
  return {position: CAMERA_CONFIG.mobilePlacesIndexPosition, lookAt: CAMERA_CONFIG.mobilePlacesIndexLookAt};
}

export function getCameraPose(
  sectionId: SectionId | null,
  isMobile = false,
): CameraPose {
  if (sectionId === null && isMobile) return MOBILE_OVERVIEW_POSE;
  if (sectionId === 'about' && isMobile) return MOBILE_ABOUT_POSE;
  if (sectionId === 'places' && isMobile) return MOBILE_PLACES_POSE;
  return CAMERA_POSES[sectionId ?? 'overview'];
}
