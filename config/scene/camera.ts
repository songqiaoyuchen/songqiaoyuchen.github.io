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
  // Travel looks level at the globe (TRAVEL_CONFIG.center) from the overview's side of the terrain; the
  // globe sits left of centre on desktop, above centre on phones.
  travelPosition: [-5.334, 16.786, -14.985] as Vector3Tuple,
  travelLookAt: [-3.107, 17.258, 0.441] as Vector3Tuple,
  // A selected trip (desktop): the globe lower left, the trip's text to its right; the globe itself turns the
  // trip to its marker point (TRAVEL_TRIP_CONFIG.markerOffset).
  travelTripPosition: [-0.821, 16.188, -4.573] as Vector3Tuple,
  travelTripLookAt: [-3.736, 24.568, 5.012] as Vector3Tuple,
  // Phones (375 × 812 reference): the whole globe and its rings in the upper half, above the peek sheet; with the
  // trip list pulled up, stepped back and higher, above the open sheet; a trip, close in at the top of the screen,
  // the trip turned to just above the sheet (TRAVEL_TRIP_CONFIG.phoneMarkerOffset).
  mobileTravelPosition: [0, 17, -29.5] as Vector3Tuple,
  mobileTravelLookAt: [0, 15.17, 0] as Vector3Tuple,
  mobileTravelIndexPosition: [0, 17, -44.4] as Vector3Tuple,
  mobileTravelIndexLookAt: [0, 9.12, 0] as Vector3Tuple,
  mobileTravelTripPosition: [0, 17, -12.1] as Vector3Tuple,
  mobileTravelTripLookAt: [0, 14.27, 0] as Vector3Tuple,
  fov: 38,
  transitionSeconds: 1.8,
  // Journeys into and out of Art.
  artTransitionSeconds: 1,
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
  travel: {
    position: CAMERA_CONFIG.travelPosition,
    lookAt: CAMERA_CONFIG.travelLookAt,
  },
};

const MOBILE_OVERVIEW_POSE: CameraPose = {
  position: CAMERA_CONFIG.mobileOverviewPosition,
  lookAt: CAMERA_CONFIG.mobileOverviewLookAt,
};

const MOBILE_TRAVEL_POSE: CameraPose = {
  position: CAMERA_CONFIG.mobileTravelPosition,
  lookAt: CAMERA_CONFIG.mobileTravelLookAt,
};

/** The camera framing a selected trip. */
export function getTravelTripPose(isMobile = false): CameraPose {
  if (isMobile) return {position: CAMERA_CONFIG.mobileTravelTripPosition, lookAt: CAMERA_CONFIG.mobileTravelTripLookAt};
  return {position: CAMERA_CONFIG.travelTripPosition, lookAt: CAMERA_CONFIG.travelTripLookAt};
}

/** Phones only: all trips with the trip list pulled up, the globe stepped back above it. */
export function getTravelIndexPose(): CameraPose {
  return {position: CAMERA_CONFIG.mobileTravelIndexPosition, lookAt: CAMERA_CONFIG.mobileTravelIndexLookAt};
}

export function getCameraPose(
  sectionId: SectionId | null,
  isMobile = false,
): CameraPose {
  if (sectionId === null && isMobile) return MOBILE_OVERVIEW_POSE;
  if (sectionId === 'travel' && isMobile) return MOBILE_TRAVEL_POSE;
  return CAMERA_POSES[sectionId ?? 'overview'];
}
