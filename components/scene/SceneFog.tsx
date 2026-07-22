'use client';

import { useControls } from 'leva';
import {FOG_CONFIG} from '@/config/scene';

export function SceneFog() {
  const { near, far } = useControls('Fog', {
    near: { value: FOG_CONFIG.near, min: 0,  max: 20, step: 0.5, label: 'Near' },
    far:  { value: FOG_CONFIG.far,  min: 2,  max: 50, step: 0.5, label: 'Far'  },
  });

  return <fog attach="fog" args={[FOG_CONFIG.color, near, far]} />;
}
