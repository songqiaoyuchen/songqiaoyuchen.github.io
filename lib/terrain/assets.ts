'use client';

import {use} from 'react';
import {
  ClampToEdgeWrapping,
  DataTexture,
  HalfFloatType,
  LinearFilter,
  RedFormat,
  RGFormat,
} from 'three';
import type {HeightGrid, TerrainMaps} from './bake';
import {loadTerrainManifest, type TerrainArtifact} from './manifest';

export type TerrainAssets = Omit<TerrainMaps, 'gradientMap'> & {
  gradientMap: DataTexture | null;
  staticLightingMap: DataTexture;
};

let assetsPromise: Promise<TerrainAssets> | null = null;

function configureTexture(texture: DataTexture) {
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

async function decompressArtifact(artifact: TerrainArtifact) {
  const response = await fetch(`/textures/terrain/baked/${artifact.file}`, {
    cache: 'force-cache',
  });
  if (!response.ok) {
    throw new Error(`Unable to load terrain artifact ${artifact.file} (${response.status}).`);
  }
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot decompress the terrain assets.');
  }
  const stream = response.body?.pipeThrough(new DecompressionStream('gzip'));
  if (!stream) throw new Error(`Terrain artifact ${artifact.file} returned no body.`);
  const buffer = await new Response(stream).arrayBuffer();
  if (buffer.byteLength !== artifact.byteLength) {
    throw new Error(`Terrain artifact ${artifact.file} has an invalid byte length.`);
  }
  return buffer;
}

function loadTerrainAssets() {
  assetsPromise ??= loadTerrainManifest().then(async ({artifacts}) => {
    const [displacementBuffer, gradientBuffer, shellBuffer, lightingBuffer] = await Promise.all([
      decompressArtifact(artifacts.displacement),
      process.env.NODE_ENV === 'development'
        ? decompressArtifact(artifacts.gradient)
        : Promise.resolve(null),
      decompressArtifact(artifacts.shell),
      decompressArtifact(artifacts.staticLighting),
    ]);
    const displacement = artifacts.displacement;
    const shell = artifacts.shell;
    const lighting = artifacts.staticLighting;
    const displacementMap = configureTexture(new DataTexture(
      new Uint16Array(displacementBuffer),
      displacement.width,
      displacement.height,
      RedFormat,
      HalfFloatType,
    ));
    displacementMap.name = 'Terrain.Displacement';
    const gradientMap = gradientBuffer === null
      ? null
      : configureTexture(new DataTexture(
        new Uint16Array(gradientBuffer),
        artifacts.gradient.width,
        artifacts.gradient.height,
        RGFormat,
        HalfFloatType,
      ));
    if (gradientMap) gradientMap.name = 'Terrain.Gradient';
    const staticLightingMap = configureTexture(new DataTexture(
      new Uint16Array(lightingBuffer),
      lighting.width,
      lighting.height,
      RGFormat,
      HalfFloatType,
    ));
    staticLightingMap.name = 'Terrain.StaticLighting';
    const shellBase: HeightGrid = {
      data: new Float32Array(shellBuffer),
      height: shell.height,
      width: shell.width,
    };
    return {displacementMap, gradientMap, shellBase, staticLightingMap};
  });
  return assetsPromise;
}

export function useTerrainAssets() {
  return use(loadTerrainAssets());
}
