'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useControls } from 'leva';
import { TextureLoader, PlaneGeometry, ShaderMaterial, Color, Vector3, UniformsLib, UniformsUtils } from 'three';
import { TERRAIN_CONFIG } from '@/config/terrain';
import vertexShader from '@/shaders/terrain.vert';
import fragmentShader from '@/shaders/terrain.frag';
import { CameraLogger } from './debug/CameraLogger';
import type { OrbitControls as OrbitControlsInstance } from 'three-stdlib'

function FogController() {
  const { near, far } = useControls('Fog', {
    near: { value: TERRAIN_CONFIG.fog.near, min: 0,  max: 20, step: 0.5, label: 'Near' },
    far:  { value: TERRAIN_CONFIG.fog.far,  min: 2,  max: 50, step: 0.5, label: 'Far'  },
  });

  return <fog attach="fog" args={[TERRAIN_CONFIG.fog.color, near, far]} />;
}

function azElToDir(azimuthDeg: number, elevationDeg: number): Vector3 {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  return new Vector3(
    Math.cos(el) * Math.sin(az),
    Math.sin(el),
    Math.cos(el) * Math.cos(az),
  ).normalize();
}

function TerrainMesh() {
  const texture = useLoader(TextureLoader, '/textures/heightmap.png');
  const surfaceMatRef = useRef<ShaderMaterial>(null);

  const { elevation, seaLevel, fadeEnabled, fadeHeight, fadeFalloff, baseColor, ridgeColor, lightAzimuth, lightElevation, lightIntensity } = useControls('Terrain', {
    elevation: {
      value: TERRAIN_CONFIG.material.elevation,
      min: 0.5, max: 40, step: 0.1,
      label: 'Elevation',
    },
    seaLevel: {
      value: TERRAIN_CONFIG.material.seaLevel,
      min: 0, max: 1, step: 0.01,
      label: 'Sea Level',
    },
    fadeEnabled: {
      value: TERRAIN_CONFIG.material.fadeEnabled,
      label: 'Fade Enabled',
    },
    fadeHeight: {
      value: TERRAIN_CONFIG.material.fadeHeight,
      min: 0, max: 1, step: 0.01,
      label: 'Fade Height',
    },
    fadeFalloff: {
      value: TERRAIN_CONFIG.material.fadeFalloff,
      min: 0.5, max: 100, step: 0.1,
      label: 'Fade Falloff',
    },
    baseColor:  { value: TERRAIN_CONFIG.material.baseColor,  label: 'Base Color'  },
    ridgeColor: { value: TERRAIN_CONFIG.material.ridgeColor, label: 'Ridge Color' },
    lightAzimuth: {
      value: TERRAIN_CONFIG.material.lightAzimuth,
      min: 0, max: 360, step: 1,
      label: 'Light Azimuth',
    },
    lightElevation: {
      value: TERRAIN_CONFIG.material.lightElevation,
      min: 0, max: 90, step: 1,
      label: 'Light Elevation',
    },
    lightIntensity: {
      value: TERRAIN_CONFIG.material.lightIntensity,
      min: 0, max: 50, step: 0.05,
      label: 'Light Intensity',
    },
  });

  useEffect(() => {
    const mat = surfaceMatRef.current;
    if (!mat) return;
    mat.uniforms.elevation.value     = elevation;
    mat.uniforms.seaLevel.value      = seaLevel;
    mat.uniforms.fadeEnabled.value   = fadeEnabled;
    mat.uniforms.fadeHeight.value    = fadeHeight;
    mat.uniforms.fadeFalloff.value   = fadeFalloff;
    mat.uniforms.baseColor.value.set(baseColor);
    mat.uniforms.ridgeColor.value.set(ridgeColor);
    mat.uniforms.lightDir.value.copy(azElToDir(lightAzimuth, lightElevation));
    mat.uniforms.lightIntensity.value = lightIntensity;
  }, [elevation, seaLevel, fadeEnabled, fadeHeight, fadeFalloff, baseColor, ridgeColor, lightAzimuth, lightElevation, lightIntensity]);

  const uniforms = useMemo(() => UniformsUtils.merge([
    UniformsLib.fog,
    {
      heightmap:      { value: texture },
      elevation:      { value: TERRAIN_CONFIG.material.elevation },
      contrast:       { value: TERRAIN_CONFIG.material.contrast },
      seaLevel:       { value: TERRAIN_CONFIG.material.seaLevel },
      fadeEnabled:    { value: TERRAIN_CONFIG.material.fadeEnabled },
      fadeHeight:     { value: TERRAIN_CONFIG.material.fadeHeight },
      fadeFalloff:    { value: TERRAIN_CONFIG.material.fadeFalloff },
      baseColor:      { value: new Color(TERRAIN_CONFIG.material.baseColor) },
      ridgeColor:     { value: new Color(TERRAIN_CONFIG.material.ridgeColor) },
      lightDir:       { value: azElToDir(TERRAIN_CONFIG.material.lightAzimuth, TERRAIN_CONFIG.material.lightElevation) },
      lightIntensity: { value: TERRAIN_CONFIG.material.lightIntensity },
    },
  ]), [texture]);

  const geometry = useMemo(
    () => new PlaneGeometry(TERRAIN_CONFIG.mesh.planeSize, TERRAIN_CONFIG.mesh.planeSize, TERRAIN_CONFIG.mesh.segments, TERRAIN_CONFIG.mesh.segments),
    [],
  );

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={TERRAIN_CONFIG.mesh.position}>
      <shaderMaterial
        ref={surfaceMatRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        fog
      />
    </mesh>
  );
}

export function TerrainBackground() {

  const orbitcontrolsRef = useRef<OrbitControlsInstance>(null);

  return (
    <div className="absolute bottom-0 left-0 w-full h-full" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: TERRAIN_CONFIG.camera.position, fov: TERRAIN_CONFIG.camera.fov }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <OrbitControls ref={orbitcontrolsRef} target={TERRAIN_CONFIG.camera.target} makeDefault />
        <CameraLogger controlsRef={orbitcontrolsRef} />
        <FogController />
        <Suspense fallback={null}>
          <TerrainMesh />
        </Suspense>
      </Canvas>
    </div>
  );
}
