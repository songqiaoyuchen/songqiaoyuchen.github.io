// Under water the canvas renders at no more than LAKE_DIVE_CONFIG.maxPixelRatio; the device's own comes back on
// surfacing. The composer sizes its buffers only when the canvas's CSS size changes, so a pixel-ratio change has
// to resize it here too, or its passes would keep drawing at the old drawing-buffer size and the cap would save
// nothing. Both changes land while the veil is black.
'use client';

import {useThree} from '@react-three/fiber';
import {useEffect, useRef, type RefObject} from 'react';
import type {EffectComposer} from 'postprocessing';
import {LAKE_DIVE_CONFIG} from '@/config/scene/lake';

type LakePixelRatioProps = {
  underwater: boolean;
  composerRef: RefObject<EffectComposer | null>;
};

export function LakePixelRatio({underwater, composerRef}: LakePixelRatioProps) {
  const setDpr = useThree((state) => state.setDpr);
  const size = useThree((state) => state.size);
  const restore = useRef<number | null>(null);

  useEffect(() => {
    const device = Math.min(window.devicePixelRatio || 1, 2);
    if (underwater && device > LAKE_DIVE_CONFIG.maxPixelRatio) {
      restore.current = device;
      setDpr(LAKE_DIVE_CONFIG.maxPixelRatio);
    } else if (!underwater && restore.current !== null) {
      setDpr(restore.current);
      restore.current = null;
    } else {
      return;
    }
    // The composer reads the renderer's drawing-buffer size, which setDpr has just changed.
    composerRef.current?.setSize(size.width, size.height);
  }, [composerRef, setDpr, size.height, size.width, underwater]);

  return null;
}
