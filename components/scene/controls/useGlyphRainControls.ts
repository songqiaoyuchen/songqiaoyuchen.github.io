// Leva "Glyph Rain" folder (dev only, hidden on About); Save Config writes every key to config/scene/glyphRain.ts.
// Each value is a [min, max] range; every column picks its own speed within it.
import {useControls} from 'leva';
import {GLYPH_RAIN_CONFIG} from '@/config/scene';
import {HOME_SCENE_FOLDER} from './sectionScope';

const ANIMATION = GLYPH_RAIN_CONFIG.animation;

export function useGlyphRainControls() {
  return useControls('Glyph Rain', {
    // GlyphRain.tsx: how fast the columns fall, in glyph rows per second.
    fallRowsPerSecond: {
      value: [...ANIMATION.fallRowsPerSecond],
      min: 0,
      max: 12,
      step: 0.1,
      label: 'Stream Speed',
    },
    // GlyphRain.tsx: how fast the bright packets travel down a column.
    packetRowsPerSecond: {
      value: [...ANIMATION.packetRowsPerSecond],
      min: 0,
      max: 24,
      step: 0.1,
      label: 'Packet Speed',
    },
    // GlyphRain.tsx: how often letters swap to a new glyph.
    letterSwapsPerSecond: {
      value: [...ANIMATION.letterSwapsPerSecond],
      min: 0,
      max: 12,
      step: 0.1,
      label: 'Letter Swap Speed',
    },
  }, HOME_SCENE_FOLDER);
}
