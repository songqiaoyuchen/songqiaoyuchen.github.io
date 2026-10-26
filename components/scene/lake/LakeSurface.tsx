// The lake on the homepage terrain: a water surface at a set level over the plain below the hero, cut to an
// irregular shore and hidden by the terrain cache's depth where the ground rises above it. It glows on hover and
// an HTML button over it (clickable, focusable, labelled) starts the dive; once the bottle has been found, a
// second control reopens the letter without diving.
'use client';

import {Html} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {useEffect, useMemo, useRef, useState} from 'react';
import {
  BufferAttribute, BufferGeometry, Color, NormalBlending, Vector2, Vector3, type Camera, type DepthTexture, type Mesh,
  type Object3D, type ShaderMaterial,
} from 'three';
import type {TerrainControlValues} from '@/components/scene/controls/useSceneControls';
import type {LakeState} from '@/components/lake/lakeState';
import {LAKE_CONFIG, LAKE_FLOW} from '@/config/scene/lake';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {useTerrainAssets} from '@/lib/terrain/assets';
import {sampleSurfaceHeight} from '@/lib/terrain/height';
import fragmentShader from '@/shaders/lake/lake.frag';
import vertexShader from '@/shaders/lake/lake.vert';

const RINGS = 40;
const SEGMENTS = 96;
const FADE_RATE = 4;
const HOVER_RATE = 6;
const DEPTH_BIAS = 0.0006;

// The controls' screen position: the lake's centre, kept this far inside the viewport (phones see the lake at
// the screen's edge).
const SCREEN_MARGIN = {x: 84, y: 72};
const PROJECTED = new Vector3();
function placeControls(object: Object3D, camera: Camera, size: {width: number; height: number}) {
  object.getWorldPosition(PROJECTED).project(camera);
  const x = (PROJECTED.x + 1) / 2 * size.width;
  const y = (1 - PROJECTED.y) / 2 * size.height;
  return [
    Math.min(Math.max(x, SCREEN_MARGIN.x), size.width - SCREEN_MARGIN.x),
    Math.min(Math.max(y, SCREEN_MARGIN.y), size.height - SCREEN_MARGIN.y),
  ];
}

const HIT_CLASS = `lake-hit block cursor-pointer rounded-full border border-transparent bg-transparent
  text-transparent outline-none transition-colors focus-visible:border-line-hover focus-visible:bg-accent-dim`;
const LETTER_CLASS = `lake-letter-link block cursor-pointer border-0 bg-transparent p-0 font-mono text-micro
  uppercase tracking-label text-accent-muted transition-colors hover:text-accent focus-visible:text-accent
  focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-accent`;

type LakeSurfaceProps = {
  /** The home scene is shown (not Art, About, Places or the crack). */
  visible: boolean;
  state: LakeState;
  completed: boolean;
  terrainDepthTexture: DepthTexture | null;
  terrainSettings: TerrainControlValues;
  meshRef: (mesh: Mesh | null) => void;
  onEnter: () => void;
  onReadLetter: () => void;
};

export function LakeSurface({
  visible, state, completed, terrainDepthTexture, terrainSettings, meshRef, onEnter, onReadLetter,
}: LakeSurfaceProps) {
  const materialRef = useRef<ShaderMaterial>(null);
  const {shellBase} = useTerrainAssets();
  const {elevation, seaLevel} = terrainSettings;
  const reducedMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const fade = useRef(0);
  const hover = useRef(0);
  const entering = useRef(-1);
  const [cx, cz] = LAKE_CONFIG.center;
  const [rx, rz] = LAKE_CONFIG.radii;

  // A disc of RINGS × SEGMENTS at the water level; each vertex carries the ground's depth under it (shore) and
  // its share of the radius (rim), which the shader cuts to the shore.
  const geometry = useMemo(() => {
    const count = 1 + RINGS * SEGMENTS;
    const positions = new Float32Array(count * 3);
    const shore = new Float32Array(count);
    const rim = new Float32Array(count);
    const set = (index: number, x: number, z: number, r: number) => {
      positions[index * 3] = x;
      positions[index * 3 + 1] = z;
      positions[index * 3 + 2] = 0;
      shore[index] = LAKE_CONFIG.level - sampleSurfaceHeight(shellBase, cx + x, cz + z, elevation, seaLevel);
      rim[index] = r;
    };
    set(0, 0, 0, 0);
    for (let ring = 1; ring <= RINGS; ring++) {
      // Denser rings toward the shore, where the cut and the shoreline live.
      const r = Math.pow(ring / RINGS, 0.7);
      for (let segment = 0; segment < SEGMENTS; segment++) {
        const angle = segment / SEGMENTS * Math.PI * 2;
        set(1 + (ring - 1) * SEGMENTS + segment, Math.cos(angle) * r * rx, Math.sin(angle) * r * rz, r);
      }
    }
    const indices: number[] = [];
    for (let segment = 0; segment < SEGMENTS; segment++) {
      indices.push(0, 1 + segment, 1 + (segment + 1) % SEGMENTS);
    }
    for (let ring = 1; ring < RINGS; ring++) {
      for (let segment = 0; segment < SEGMENTS; segment++) {
        const a = 1 + (ring - 1) * SEGMENTS + segment;
        const b = 1 + (ring - 1) * SEGMENTS + (segment + 1) % SEGMENTS;
        const c = a + SEGMENTS;
        const d = b + SEGMENTS;
        indices.push(a, c, b, b, c, d);
      }
    }
    const built = new BufferGeometry();
    built.setAttribute('position', new BufferAttribute(positions, 3));
    built.setAttribute('shore', new BufferAttribute(shore, 1));
    built.setAttribute('rim', new BufferAttribute(rim, 1));
    built.setIndex(indices);
    return built;
  }, [cx, cz, elevation, rx, rz, seaLevel, shellBase]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(() => ({
    uTerrainDepth: {value: null as DepthTexture | null},
    uUseTerrainDepth: {value: 0},
    uTime: {value: 0},
    uHover: {value: 0},
    uDive: {value: 0},
    uVisibility: {value: 0},
    uRadii: {value: new Vector2(rx, rz)},
    uShoreNoise: {value: LAKE_CONFIG.shoreNoise},
    uDepthBias: {value: DEPTH_BIAS},
    uWater: {value: new Color(LAKE_CONFIG.water)},
    uGold: {value: new Color(LAKE_CONFIG.gold)},
    uCyan: {value: new Color(LAKE_CONFIG.cyan)},
  }), [rx, rz]);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uTerrainDepth.value = terrainDepthTexture;
    material.uniforms.uUseTerrainDepth.value = terrainDepthTexture ? 1 : 0;
  }, [terrainDepthTexture]);

  useEffect(() => {
    if (state === 'entering') entering.current = 0;
    else if (state === 'idle') entering.current = -1;
  }, [state]);

  const shown = visible && (state === 'idle' || state === 'entering' || state === 'returning');
  useFrame(({clock}, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const step = Math.min(delta, 1 / 30);
    const target = shown ? 1 : 0;
    fade.current = reducedMotion ? target : fade.current + (target - fade.current) * (1 - Math.exp(-FADE_RATE * step));
    const hoverTarget = hovered && state === 'idle' ? 1 : 0;
    hover.current += (hoverTarget - hover.current) * (1 - Math.exp(-HOVER_RATE * step));
    if (entering.current >= 0) entering.current += delta;
    const dive = entering.current < 0 ? 0 : Math.min(entering.current / LAKE_FLOW.entryFlight, 1);
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uHover.value = hover.current;
    material.uniforms.uDive.value = dive * dive;
    material.uniforms.uVisibility.value = fade.current;
    material.visible = fade.current > 0.002;
  });

  const interactive = visible && state === 'idle';
  return (
    <group position={[cx, LAKE_CONFIG.level, cz]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        frustumCulled={false}
        renderOrder={2}
        onPointerOver={interactive ? () => setHovered(true) : undefined}
        onPointerOut={interactive ? () => setHovered(false) : undefined}
        onClick={interactive ? (event) => {
          event.stopPropagation();
          onEnter();
        } : undefined}
      >
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={NormalBlending}
        />
      </mesh>
      {interactive ? (
        <Html center zIndexRange={[30, 10]} position={[0, 0, 0.2]} calculatePosition={placeControls}>
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              className={HIT_CLASS}
              aria-label={completed ? 'Dive into the lake again' : 'Dive into the lake'}
              onPointerEnter={() => setHovered(true)}
              onPointerLeave={() => setHovered(false)}
              onFocus={() => setHovered(true)}
              onBlur={() => setHovered(false)}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onEnter();
              }}
            />
            {completed ? (
              <button
                type="button"
                className={LETTER_CLASS}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onReadLetter();
                }}
              >
                Read the letter
              </button>
            ) : null}
          </div>
        </Html>
      ) : null}
    </group>
  );
}
