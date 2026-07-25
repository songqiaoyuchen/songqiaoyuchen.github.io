'use client';

import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, StatsGl } from '@react-three/drei';
import { EffectComposer } from '@react-three/postprocessing';
import { SMAAPreset } from 'postprocessing';
import type {DepthTexture, Mesh} from 'three';
import type { OrbitControls as OrbitControlsInstance } from 'three-stdlib';
import {CAMERA_CONFIG, FOG_CONFIG} from '@/config/scene';
import { SaveCameraButton } from '@/components/debug/SaveCameraButton';
import { ColorOnlySMAA } from '@/components/effects/ColorOnlySMAA';
import {IsolatedBloom} from '@/components/effects/IsolatedBloom';
import { SaveConfigButton } from '@/components/debug/SaveConfigButton';
import {useSceneControls} from '@/components/debug/useSceneControls';
import { SceneFog } from './SceneFog';
import {CachedTerrain} from './CachedTerrain';
import { ContourLines } from './ContourLines';
import { DecorStreams } from './DecorStreams';
import {LinkStreams} from './LinkStreams';
import {SceneHeroName} from './SceneHeroName';
import { CameraRig } from './CameraRig';
import type {SectionId} from '@/data/sections';

type TerrainBackgroundProps = {
  activeId: SectionId | null;
  onStreamClick: (id: SectionId) => void;
};

export function TerrainBackground({
  activeId,
  onStreamClick,
}: TerrainBackgroundProps) {
  const orbitcontrolsRef = useRef<OrbitControlsInstance>(null);
  const [contourMesh, setContourMesh] = useState<Mesh | null>(null);
  const [linkStreamsMesh, setLinkStreamsMesh] = useState<Mesh | null>(null);
  const [heroNameMesh, setHeroNameMesh] = useState<Mesh | null>(null);
  const [terrainDepthTexture, setTerrainDepthTexture] = useState<DepthTexture | null>(null);
  const settings = useSceneControls();
  const bloomSelection = useMemo(
    () => [contourMesh, linkStreamsMesh, heroNameMesh]
      .filter((mesh): mesh is Mesh => mesh !== null),
    [contourMesh, heroNameMesh, linkStreamsMesh],
  );

  return (
    <div className="absolute inset-0 z-0">
      <SaveConfigButton values={settings} />
      <Canvas
        camera={{position: CAMERA_CONFIG.overviewPosition, fov: CAMERA_CONFIG.fov}}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >

        {process.env.NODE_ENV === 'development' ? (
          <StatsGl className="fixed right-0 bottom-0 z-10000" />
        ) : null}
        
        <color attach="background" args={[FOG_CONFIG.color]} />
        <OrbitControls ref={orbitcontrolsRef} target={CAMERA_CONFIG.overviewTarget} makeDefault />
        <CameraRig controlsRef={orbitcontrolsRef} isFocused={activeId !== null} />
        <SaveCameraButton controlsRef={orbitcontrolsRef} isFocused={activeId !== null} />
        <SceneFog settings={settings.fog} />
        <Suspense fallback={null}>
          <CachedTerrain
            fogSettings={settings.fog}
            onDepthTextureChange={setTerrainDepthTexture}
            terrainSettings={settings.terrain}
          />
          <ContourLines
            ref={setContourMesh}
            contourSettings={settings.contours}
            terrainDepthTexture={terrainDepthTexture}
            terrainSettings={settings.terrain}
          />
          <DecorStreams
            contourSettings={settings.contours}
            terrainSettings={settings.terrain}
          />
          <LinkStreams
            ref={setLinkStreamsMesh}
            activeId={activeId}
            contourSettings={settings.contours}
            onStreamClick={onStreamClick}
            terrainSettings={settings.terrain}
          />
          <SceneHeroName
            ref={setHeroNameMesh}
            contourSettings={settings.contours}
            isHidden={activeId !== null}
            terrainSettings={settings.terrain}
          />
        </Suspense>
        {/* Keep the composer single-sampled: MSAA resolve blits intermittently
            present empty frames on some GPUs. Color-only SMAA smooths edges
            without requesting the composer's sampled depth texture. */}
        {bloomSelection.length === 3 ? (
          <EffectComposer multisampling={0}>
            <ColorOnlySMAA preset={SMAAPreset.MEDIUM} />
            <IsolatedBloom
              selection={bloomSelection}
              resolutionScale={0.5}
              intensity={settings.postProcessing.bloomIntensity}
              luminanceThreshold={settings.postProcessing.bloomThreshold}
              luminanceSmoothing={settings.postProcessing.bloomSmoothing}
            />
          </EffectComposer>
        ) : null}
      </Canvas>
    </div>
  );
}
