'use client';

import {useLayoutEffect} from 'react';
import {useTexture} from '@react-three/drei';
import {RepeatWrapping, type Texture} from 'three';
import type {TerrainControlValues} from '@/components/debug/useSceneControls';
import {PENCIL_TERRAIN_CONFIG} from '@/config/scene/pencil';
import {TerrainMesh} from './TerrainMesh';

function configureHatches(textures: Texture[]) {
  for (const texture of textures) {
    // Packed RGB channels are independent hatch densities, not sRGB color.
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }
}

export function PencilTerrain({settings, onReady}: {
  settings: TerrainControlValues;
  onReady: () => void;
}) {
  const [noise, dark, bright] = useTexture([
    PENCIL_TERRAIN_CONFIG.noiseMap,
    PENCIL_TERRAIN_CONFIG.hatchDarkMap,
    PENCIL_TERRAIN_CONFIG.hatchBrightMap,
  ], configureHatches);
  useLayoutEffect(onReady, [onReady, noise, dark, bright]);
  return <TerrainMesh settings={settings} pencilTextures={{noise, dark, bright}} />;
}
