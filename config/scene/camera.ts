import type {Vector3Tuple} from 'three';
import type {SectionId} from '@/config/navigation/linkStreams';

export type CameraPose = Readonly<{
  lookAt: Vector3Tuple;
  position: Vector3Tuple;
}>;

export const CAMERA_CONFIG = {
  overviewPosition: [7.051, 13.416, -9.158] as Vector3Tuple,
  overviewLookAt: [3.368, 10.763, 3.04] as Vector3Tuple,
  projectsPosition: [3.397, 13.444, -6.564] as Vector3Tuple,
  projectsLookAt: [1.071, 10.028, 3.214] as Vector3Tuple,
  artPosition: [3.397, 13.444, -6.564] as Vector3Tuple,
  artLookAt: [1.071, 10.028, 3.214] as Vector3Tuple,
  blogPosition: [3.397, 13.444, -6.564] as Vector3Tuple,
  blogLookAt: [1.071, 10.028, 3.214] as Vector3Tuple,
  aboutPosition: [3.397, 13.444, -6.564] as Vector3Tuple,
  aboutLookAt: [1.071, 10.028, 3.214] as Vector3Tuple,
  fov: 38,
  damping: 4.6,
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

export function getCameraPose(sectionId: SectionId | null): CameraPose {
  return CAMERA_POSES[sectionId ?? 'overview'];
}
