'use client';

import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';

type SceneReadySignalProps = {
  enabled: boolean;
  onReady: () => void;
};

export function SceneReadySignal({enabled, onReady}: SceneReadySignalProps) {
  const completedFrames = useRef(0);
  const reported = useRef(false);

  useFrame(() => {
    if (reported.current) return;
    if (!enabled) {
      completedFrames.current = 0;
      return;
    }
    completedFrames.current += 1;
    if (completedFrames.current < 2) return;
    reported.current = true;
    onReady();
  });

  return null;
}
