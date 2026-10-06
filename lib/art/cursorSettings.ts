// Live Art cursor settings, read every frame; Leva "Art Cursor" (ArtCursorControls) retunes them.
import {ART_CURSOR_CONFIG} from '@/config/art/cursor';

/** Live Art cursor settings, read every frame. Development controls retune them. */
export const artCursorSettings = {
  touchRadius: ART_CURSOR_CONFIG.touchRadius as number,
  healSeconds: ART_CURSOR_CONFIG.healSeconds as number,
  smudgeHealSeconds: ART_CURSOR_CONFIG.oil.smudgeHealSeconds as number,
  smudgeDrag: ART_CURSOR_CONFIG.oil.smudgeDrag as number,
  pencilStrength: ART_CURSOR_CONFIG.pencil.pencilStrength as number,
  dotsStrength: ART_CURSOR_CONFIG.dots.dotsStrength as number,
};
