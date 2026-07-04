'use client';

import { useControls } from 'leva';
import { TERRAIN_CONFIG } from '@/config/terrain';

export function SceneFog() {
  const { near, far } = useControls('Fog', {
    near: { value: TERRAIN_CONFIG.fog.near, min: 0,  max: 20, step: 0.5, label: 'Near' },
    far:  { value: TERRAIN_CONFIG.fog.far,  min: 2,  max: 50, step: 0.5, label: 'Far'  },
  });

  return <fog attach="fog" args={[TERRAIN_CONFIG.fog.color, near, far]} />;
}
