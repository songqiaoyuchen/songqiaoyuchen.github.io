'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useControls } from 'leva';
import { TextureLoader, PlaneGeometry, ShaderMaterial, Color, UniformsLib, UniformsUtils, Vector3 } from 'three';
import { TERRAIN_CONFIG } from '@/config/terrain';

const vertexShader = /* glsl */ `
  #include <fog_pars_vertex>

  uniform sampler2D heightmap;
  uniform float elevation;
  uniform float contrast;

  void main() {
    float h = texture2D(heightmap, uv).r;
    h = pow(h, contrast);
    vec3 pos = position;
    pos.z += h * elevation;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  #include <fog_pars_fragment>

  uniform vec3 color;
  uniform float opacity;

  void main() {
    gl_FragColor = vec4(color, opacity);
    #include <fog_fragment>
  }
`;

function CameraLogger() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  useEffect(() => {
    camera.lookAt(...TERRAIN_CONFIG.camera.lookAt);
    (window as any).logCam = () => {
      const p = camera.position;
      const d = camera.getWorldDirection(new Vector3());
      const t = controlsRef.current?.target;
      console.log(`position: [${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}]`);
      console.log(`direction: [${d.x.toFixed(3)}, ${d.y.toFixed(3)}, ${d.z.toFixed(3)}]`);
      console.log(`zoom: ${camera.zoom.toFixed(3)}`);
      if (t) console.log(`target: [${t.x.toFixed(3)}, ${t.y.toFixed(3)}, ${t.z.toFixed(3)}]`);
    };
  }, [camera]);
  return <OrbitControls ref={controlsRef} target={TERRAIN_CONFIG.camera.target} makeDefault />;
}

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

  const { elevation } = useControls('Terrain', {
    elevation: { value: TERRAIN_CONFIG.material.elevation, min: 0.5, max: 40, step: 0.1, label: 'Elevation' },
  });

  useEffect(() => {
    if (!matRef.current) return;
    matRef.current.uniforms.elevation.value = elevation;
  }, [elevation]);

  const uniforms = useMemo(() => UniformsUtils.merge([
    UniformsLib.fog,
    {
      heightmap: { value: texture },
      elevation: { value: TERRAIN_CONFIG.material.elevation },
      contrast:  { value: TERRAIN_CONFIG.material.contrast },
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
  return (
    <div className="absolute bottom-0 left-0 w-full h-full" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: TERRAIN_CONFIG.camera.position, fov: TERRAIN_CONFIG.camera.fov }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <CameraLogger />
        <FogController />
        <Suspense fallback={null}>
          <TerrainMesh />
        </Suspense>
      </Canvas>
    </div>
  );
}
