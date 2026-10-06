// SMAA antialiasing that detects edges by colour only, so the composer never needs a depth texture.
'use client';

import { wrapEffect } from '@react-three/postprocessing';
import {
  EdgeDetectionMode,
  EffectAttribute,
  PredicationMode,
  SMAAEffect,
  SMAAPreset,
} from 'postprocessing';

export type ColorOnlySMAAOptions = {
  preset?: SMAAPreset;
};

class ColorOnlySMAAEffect extends SMAAEffect {
  constructor({ preset = SMAAPreset.MEDIUM }: ColorOnlySMAAOptions = {}) {
    super({
      preset,
      edgeDetectionMode: EdgeDetectionMode.COLOR,
      predicationMode: PredicationMode.DISABLED,
    });

    // Color-edge SMAA does not sample scene depth. Removing the DEPTH flag
    // prevents EffectComposer from creating and copying a depth texture.
    this.setAttributes(EffectAttribute.CONVOLUTION);
  }
}

export const ColorOnlySMAA = wrapEffect(ColorOnlySMAAEffect);
