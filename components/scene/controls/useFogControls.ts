// Leva "Fog" folder (dev only); Save Config writes both keys to config/scene/fog.ts.
import {useControls} from 'leva';
import {FOG_CONFIG} from '@/config/scene';

export function useFogControls() {
  return useControls('Fog', {
    // SceneFog.tsx (+ CachedTerrain): distance where the fog starts.
    near: {value: FOG_CONFIG.near, min: 0, max: 20, step: 0.5, label: 'Near'},
    // SceneFog.tsx (+ CachedTerrain): distance where the fog is opaque.
    far: {value: FOG_CONFIG.far, min: 2, max: 50, step: 0.5, label: 'Far'},
  });
}
