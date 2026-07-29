import {VIEWPORT_BREAKPOINTS} from '@/config/breakpoints';

/** Shared viewport assumptions used to author the homepage WebGL composition. */
export const SCENE_LAYOUT_CONFIG = {
  referenceViewport: {
    width: 1440,
    height: 900,
  },
  mobileMaxWidth: VIEWPORT_BREAKPOINTS.md,
  minCoverFov: 38,
} as const;
