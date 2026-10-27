// SMAA antialiasing that detects edges by colour only, so the composer never needs a depth texture.
'use client';

import {useEffect, useMemo} from 'react';
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

  /** Sets the edge threshold, returning the one it replaces. */
  swapEdgeThreshold(value: number) {
    const previous = this.edgeDetectionMaterial.edgeDetectionThreshold;
    this.edgeDetectionMaterial.edgeDetectionThreshold = value;
    return previous;
  }
}

// `edgeThreshold` overrides the preset's edge threshold (on the composer's linear colour) while it is given: the
// lake dive's dim walls against black water need fainter edges found than the preset's 0.1.
export function ColorOnlySMAA({
  preset = SMAAPreset.MEDIUM,
  edgeThreshold,
}: ColorOnlySMAAOptions & {edgeThreshold?: number}) {
  const effect = useMemo(() => new ColorOnlySMAAEffect({preset}), [preset]);
  useEffect(() => () => effect.dispose(), [effect]);
  useEffect(() => {
    if (edgeThreshold === undefined) return;
    const usual = effect.swapEdgeThreshold(edgeThreshold);
    return () => {
      effect.swapEdgeThreshold(usual);
    };
  }, [effect, edgeThreshold]);
  return <primitive object={effect} dispose={null} />;
}
