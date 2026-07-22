import {FOG_CONFIG} from '@/config/scene';
import type {FogControlValues} from '@/components/debug/useSceneControls';

export function SceneFog({settings}: {settings: FogControlValues}) {
  return <fog attach="fog" args={[FOG_CONFIG.color, settings.near, settings.far]} />;
}
