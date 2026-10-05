import type {Vector3Tuple} from 'three';
import type {SectionId} from '@/config/navigation/linkStreams';

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
  fov: 38,
  transitionSeconds: 1.8,
  // Journeys into and out of Art.
  artTransitionSeconds: 1.5,
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
};

const MOBILE_OVERVIEW_POSE: CameraPose = {
  position: CAMERA_CONFIG.mobileOverviewPosition,
  lookAt: CAMERA_CONFIG.mobileOverviewLookAt,
};

export function getCameraPose(
  sectionId: SectionId | null,
  isMobile = false,
): CameraPose {
  if (sectionId === null && isMobile) return MOBILE_OVERVIEW_POSE;
  return CAMERA_POSES[sectionId ?? 'overview'];
}
