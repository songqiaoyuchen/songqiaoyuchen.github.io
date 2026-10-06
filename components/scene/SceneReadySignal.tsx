// Reports the scene ready once all shaders compiled and two full frames rendered (ends the preloader).
'use client';

import {useLayoutEffect, useRef, useState} from 'react';
import {useFrame, useThree} from '@react-three/fiber';

type SceneReadySignalProps = {
  enabled: boolean;
  onProgress: (progress: number) => void;
  onReady: () => void;
};

export function SceneReadySignal({enabled, onProgress, onReady}: SceneReadySignalProps) {
  const completedFrames = useRef(0);
  const reported = useRef(false);
  const [compiled, setCompiled] = useState(false);
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useLayoutEffect(() => {
    if (!enabled) {
      completedFrames.current = 0;
      return;
    }
    let cancelled = false;
    void gl.compileAsync(scene, camera).then(() => {
      if (!cancelled) {
        setCompiled(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [camera, enabled, gl, scene]);

  useFrame(() => {
    if (reported.current) return;
    if (!enabled || !compiled) {
      completedFrames.current = 0;
      return;
    }
    completedFrames.current += 1;
    if (completedFrames.current < 2) {
      onProgress(0.9);
      return;
    }
    reported.current = true;
    onReady();
  });

  return null;
}
