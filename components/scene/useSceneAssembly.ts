// Staged scene startup: mounts terrain, contours, text, then post-processing one healthy frame at a time.
'use client';

import {useEffect, useState} from 'react';
import type {DepthTexture, Mesh} from 'three';
import {waitForHealthyFrames} from '@/lib/scene/frameBudget';

type AssemblyInputs = {
  canvasReady: boolean;
  terrainDepthTexture: DepthTexture | null;
  contourMesh: Mesh | null;
  glyphRainMesh: Mesh | null;
  /** The WebGL hero name is mounted, or Home shows the HTML one instead. */
  heroReady: boolean;
  sceneLinksMesh: Mesh | null;
  bloomReady: boolean;
  bloomSelectionCount: number;
  onSceneProgress: (progress: number) => void;
};

/**
 * Phase 1 terrain, 2 contours, 3 scene text, 4 composer + SMAA, 5 bloom,
 * 6 ready signal. Each step waits for the previous layer and for frame budget.
 */
export function useSceneAssembly({
  canvasReady,
  terrainDepthTexture,
  contourMesh,
  glyphRainMesh,
  heroReady,
  sceneLinksMesh,
  bloomReady,
  bloomSelectionCount,
  onSceneProgress,
}: AssemblyInputs) {
  const [assemblyPhase, setAssemblyPhase] = useState(0);

  useEffect(() => {
    const targetPhase = !canvasReady
      ? 0
      : !terrainDepthTexture
        ? 1
        : !contourMesh
          ? 2
          : !(glyphRainMesh && heroReady && sceneLinksMesh)
            ? 3
            : assemblyPhase < 4
              ? 4
              : assemblyPhase < 5
                ? 5
                : bloomReady
                  ? 6
                  : 5;
    if (targetPhase <= assemblyPhase) return;
    let cancelled = false;
    void waitForHealthyFrames().then(() => {
      if (!cancelled) {
        setAssemblyPhase(targetPhase);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    assemblyPhase,
    bloomReady,
    bloomSelectionCount,
    canvasReady,
    contourMesh,
    glyphRainMesh,
    heroReady,
    sceneLinksMesh,
    terrainDepthTexture,
  ]);

  useEffect(() => {
    let progress = 0.18;
    if (terrainDepthTexture) progress += 0.3;
    if (contourMesh) progress += 0.16;
    if (sceneLinksMesh) progress += 0.14;
    onSceneProgress(progress);
  }, [contourMesh, sceneLinksMesh, onSceneProgress, terrainDepthTexture]);

  return assemblyPhase;
}
