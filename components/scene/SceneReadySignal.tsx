'use client';

import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';

type SceneReadySignalProps = {
  enabled: boolean;
  onProgress: (progress: number) => void;
  onReady: () => void;
};

export function SceneReadySignal({enabled, onProgress, onReady}: SceneReadySignalProps) {
  const completedFrames = useRef(0);
  const reported = useRef(false);

  useFrame(() => {
    if (reported.current) return;
    if (!enabled) {
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
