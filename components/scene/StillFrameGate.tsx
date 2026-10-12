// Skips the composer render while the frame would be identical to the last one (a still Art gallery, About
// between checkpoints, a trip at rest), so the GPU idles; the browser keeps showing the last drawn frame until
// something changes. Home always draws: its contours pulse and the glyph rain falls.
'use client';

import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useMemo, type RefObject} from 'react';
import type {EffectComposer} from 'postprocessing';
import {StillFrameDetector} from '@/lib/scene/stillFrames';

const gated = new WeakMap<EffectComposer, {skip: boolean}>();

/** Wraps the composer's render once so a flag can skip it. */
function gateFor(composer: EffectComposer) {
  let gate = gated.get(composer);
  if (!gate) {
    const state = {skip: false};
    const render = composer.render;
    composer.render = function renderUnlessStill(deltaTime) {
      if (!state.skip) render.call(this, deltaTime);
    };
    gated.set(composer, gate = state);
  }
  return gate;
}

type StillFrameGateProps = {
  /** Off while the scene assembles or a capture reads frames back; then every route. */
  enabled: boolean;
  composerRef: RefObject<EffectComposer | null>;
};

export function StillFrameGate({enabled, composerRef}: StillFrameGateProps) {
  const detector = useMemo(() => new StillFrameDetector(), []);
  const canvas = useThree((state) => state.gl.domElement);

  // Turning the gate on, a restored context or a returning tab: always draw the next frame.
  useEffect(() => {
    detector.reset();
  }, [detector, enabled]);
  useEffect(() => {
    const redraw = () => detector.reset();
    canvas.addEventListener('webglcontextrestored', redraw);
    document.addEventListener('visibilitychange', redraw);
    return () => {
      canvas.removeEventListener('webglcontextrestored', redraw);
      document.removeEventListener('visibilitychange', redraw);
    };
  }, [canvas, detector]);

  // After every scene update (CachedTerrain runs at 0.5), before the composer renders at 1.
  useFrame(({scene, camera, size, viewport}) => {
    const composer = composerRef.current;
    if (!composer) return;
    gateFor(composer).skip = enabled
      && detector.isStill(scene, camera, size.width, size.height, viewport.dpr);
  }, 0.9);

  return null;
}
