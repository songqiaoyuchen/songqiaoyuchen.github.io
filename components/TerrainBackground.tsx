'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useControls } from 'leva';
import { TextureLoader, PlaneGeometry, ShaderMaterial, Color, UniformsLib, UniformsUtils, Vector3 } from 'three';
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

function TerrainMesh() {
  const texture = useLoader(TextureLoader, '/textures/heightmap.png');
  const matRef = useRef<ShaderMaterial>(null);

  const { elevation, seaLevel } = useControls('Terrain', {
    elevation: {
      value: TERRAIN_CONFIG.material.elevation,
      min: 0.5,
      max: 40,
      step: 0.1,
      label: 'Elevation',
    },
    seaLevel: {
      value: TERRAIN_CONFIG.material.seaLevel,
      min: 0,
      max: 1,
      step: 0.01,
      label: 'Sea Level',
    },
  })

  useEffect(() => {
    if (!matRef.current) return

    matRef.current.uniforms.elevation.value = elevation
    matRef.current.uniforms.seaLevel.value = seaLevel
  }, [elevation, seaLevel])

  const uniforms = useMemo(() => UniformsUtils.merge([
    UniformsLib.fog,
    {
      heightmap: { value: texture },
      elevation: { value: TERRAIN_CONFIG.material.elevation },
      contrast:  { value: TERRAIN_CONFIG.material.contrast },
      seaLevel:  { value: TERRAIN_CONFIG.material.seaLevel },
      color:     { value: new Color(TERRAIN_CONFIG.material.color) },
      opacity:   { value: TERRAIN_CONFIG.material.opacity },
    },
  ]), [texture]);

  const geometry = useMemo(
    () => new PlaneGeometry(TERRAIN_CONFIG.mesh.planeSize, TERRAIN_CONFIG.mesh.planeSize, TERRAIN_CONFIG.mesh.segments, TERRAIN_CONFIG.mesh.segments),
    [],
  );

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={TERRAIN_CONFIG.mesh.position}>
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        wireframe
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
