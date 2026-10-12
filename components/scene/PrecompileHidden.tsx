// Compiles the shaders of layers that mount hidden (the Travel globe and its lights, trails, rings and stars;
// the About map) while the scene is quiet, so their first visible frame does not link programs on the main
// thread in the middle of a camera journey. The intro's compile (SceneReadySignal) only reaches what is visible.
'use client';

import {useEffect, type RefObject} from 'react';
import {useThree} from '@react-three/fiber';
import type {EffectComposer} from 'postprocessing';
import type {Object3D} from 'three';

// Quiet delay after a hidden layer mounts (its geometries are being built) before its programs are linked.
const PRECOMPILE_DELAY_MS = 1500;

type PrecompileHiddenProps = {
  /** Bump when a hidden layer has mounted; each change schedules one compile. */
  revision: number;
  /** The composer the scene is drawn into: a program's key includes its output colour space, so the compile
   * must target the composer's buffer (linear), not the screen, or the first frame links the programs again. */
  composerRef: RefObject<EffectComposer | null>;
};

export function PrecompileHidden({revision, composerRef}: PrecompileHiddenProps) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      // The renderer compiles only what traverseVisible reaches: show the hidden objects for the synchronous part
      // of compileAsync (it creates and links the programs; nothing is drawn), then hide them again. Linking
      // finishes in the background where the driver supports parallel compilation.
      const hidden: Object3D[] = [];
      scene.traverse((object) => {
        if (!object.visible) {
          hidden.push(object);
          object.visible = true;
        }
      });
      let done: Promise<unknown> | null = null;
      const buffer = composerRef.current?.inputBuffer ?? null;
      try {
        gl.setRenderTarget(buffer);
        done = gl.compileAsync(scene, camera);
      } finally {
        gl.setRenderTarget(null);
        for (const object of hidden) object.visible = false;
      }
      void done?.catch(() => {});
    }, PRECOMPILE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [camera, composerRef, gl, revision, scene]);

  return null;
}
