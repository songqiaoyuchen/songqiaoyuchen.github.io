// Viewport assumptions the homepage WebGL composition was authored against.
import {VIEWPORT_BREAKPOINTS} from '@/config/breakpoints';

/** Shared viewport assumptions used to author the homepage WebGL composition. */
export const SCENE_LAYOUT_CONFIG = {
  referenceViewport: {
    width: 1440,
    height: 900,
  },
  mobileMaxWidth: VIEWPORT_BREAKPOINTS.md,
  // Places' own phone layout ends here, wider than the scene's: its poses, markers and sheet follow this width.
  placesMobileMaxWidth: VIEWPORT_BREAKPOINTS.placesSheet,
  minCoverFov: 38,
} as const;
