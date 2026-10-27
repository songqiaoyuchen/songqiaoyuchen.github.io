// The lake on the homepage terrain: a water surface at a set level over the plain below the hero, cut to an
// irregular shore and hidden by the terrain cache's depth where the ground rises above it. It glows on hover and
// an HTML button over it (clickable, focusable, labelled) starts the dive; once the bottle has been found, a
// second control reopens the letter without diving.
'use client';

import {Html} from '@react-three/drei';
import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useMemo, useRef, useState} from 'react';
import {
  BufferAttribute, BufferGeometry, Color, DataTexture, DataUtils, HalfFloatType, LinearFilter, Matrix4, Mesh,
  NormalBlending, RedFormat, UniformsLib, UniformsUtils, Vector2, Vector3, type Camera, type DepthTexture,
  type Intersection, type Object3D, type Raycaster, type ShaderMaterial,
} from 'three';
import type {TerrainControlValues} from '@/components/scene/controls/useSceneControls';
import type {LakeState} from '@/components/lake/lakeState';
import {SCENE_LAYOUT_CONFIG, SCENE_LINK_EFFECT_CONFIG} from '@/config/scene';
import {LAKE_CONFIG, LAKE_FLOW, lakePlacement} from '@/config/scene/lake';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {advanceTextVisibility} from '@/lib/scene/textTransition';
import {useTerrainAssets} from '@/lib/terrain/assets';
import {contourField} from '@/lib/terrain/contourField';
import {useCameraFrameState} from '../camera/CameraFrameState';
import fragmentShader from '@/shaders/lake/lake.frag';
import vertexShader from '@/shaders/lake/lake.vert';

const RINGS = 40;
const SEGMENTS = 96;
const FADE_RATE = 4;
const HOVER_RATE = 6;
// Ground in front of the water hides it only from this far above the water's level: a hill, not the shore's rise.
const OCCLUDER_RISE = 0.3;
// The water draws before the contour lines (its render order under theirs), so the terrain's contour at the
// lake's level draws whole over it as the shore; the lines under the water are left out by the contours
// themselves (Contours' lake prop), since their depth bias would beat a depth test against the water.

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

// The mesh's raycast, keeping only the hits that land on water: the disc reaches well past the shore (and,
// toward the camera, to the map's edge), so a plain hit on it would start the dive from the ground about the lake.
function waterRaycast(onWater: (x: number, z: number) => boolean) {
  const hits: Intersection[] = [];
  return function raycast(this: Mesh, raycaster: Raycaster, intersects: Intersection[]) {
    hits.length = 0;
    Mesh.prototype.raycast.call(this, raycaster, hits);
    for (const hit of hits) if (onWater(hit.point.x, hit.point.z)) intersects.push(hit);
  };
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
  const {elevation, seaLevel, edgeFade: [fadeStart, fadeEnd]} = terrainSettings;
  const reducedMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const fade = useRef(0);
  const hover = useRef(0);
  const entering = useRef(-1);
  // The HTML controls over the water come and go with the scene links: dissolving in once the camera has arrived,
  // at the links' own speeds, so a return from the dive shows them together (the links' reveal in SceneLinks).
  const cameraFrameState = useCameraFrameState();
  const reveal = useRef(0);
  const controlsRef = useRef<HTMLDivElement>(null);
  const {center: [cx, cz], level, disc: {center: [discX, discZ], radii: [rx, rz]}} = lakePlacement();
  const isMobile = useThree((s) => s.size.width) < SCENE_LAYOUT_CONFIG.mobileMaxWidth;
  const [controlX, controlZ] = isMobile ? LAKE_CONFIG.controlOffset.mobile : LAKE_CONFIG.controlOffset.desktop;

  // The ground under the disc, from the contour field the drawn lines are marched from, so the shore is the drawn
  // contour at the lake's level, and the terrain itself (which that field never falls below) lies under the water
  // everywhere inside it. The shader reads it per pixel as a texture of the water's depth (half floats: exact
  // about zero, where the shore is), so the shore is the field's own line and not the disc's triangles.
  const field = useMemo(
    () => contourField(shellBase, discX, discZ, rx + 1.5, rz + 1.5, elevation, seaLevel),
    [discX, discZ, elevation, rx, rz, seaLevel, shellBase],
  );
  const groundAt = field.sample;
  const shoreTexture = useMemo(() => {
    const depth = new Uint16Array(field.heights.length);
    for (let i = 0; i < depth.length; i++) depth[i] = DataUtils.toHalfFloat(level - field.heights[i]);
    const texture = new DataTexture(depth, field.width, field.height, RedFormat, HalfFloatType);
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }, [field, level]);
  useEffect(() => () => shoreTexture.dispose(), [shoreTexture]);
  // A disc of RINGS × SEGMENTS at the water level; each vertex carries its share of the radius (rim), for the
  // disc's own noise-moved cut.
  const geometry = useMemo(() => {
    // The disc lies rotated a quarter turn about x, so its local y runs along world -z; it is centred on the
    // disc's own centre, while the group (and the controls) sit at the lake's heart.
    const offsetX = discX - cx;
    const offsetY = cz - discZ;
    const count = 1 + RINGS * SEGMENTS;
    const positions = new Float32Array(count * 3);
    const rim = new Float32Array(count);
    const set = (index: number, x: number, z: number, r: number) => {
      positions[index * 3] = x;
      positions[index * 3 + 1] = z;
      positions[index * 3 + 2] = 0;
      rim[index] = r;
    };
    set(0, offsetX, offsetY, 0);
    for (let ring = 1; ring <= RINGS; ring++) {
      // Denser rings toward the disc's edge, where its cut lives.
      const r = Math.pow(ring / RINGS, 0.7);
      for (let segment = 0; segment < SEGMENTS; segment++) {
        const angle = segment / SEGMENTS * Math.PI * 2;
        set(1 + (ring - 1) * SEGMENTS + segment, offsetX + Math.cos(angle) * r * rx,
          offsetY + Math.sin(angle) * r * rz, r);
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
    built.setAttribute('rim', new BufferAttribute(rim, 1));
    built.setIndex(indices);
    return built;
  }, [cx, cz, discX, discZ, rx, rz]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // The pointer meets the water only where there is water: under the level, and before the terrain's edge fade.
  const raycast = useMemo(() => waterRaycast((x, z) => {
    const ground = groundAt(x, z);
    return !Number.isNaN(ground) && ground <= level && Math.hypot(x, z) <= fadeStart;
  }), [fadeStart, groundAt, level]);

  const uniforms = useMemo(() => ({
    ...UniformsUtils.clone(UniformsLib.fog),
    uEdgeFade: {value: new Vector2(fadeStart, fadeEnd)},
    uTerrainDepth: {value: null as DepthTexture | null},
    uUseTerrainDepth: {value: 0},
    uTime: {value: 0},
    uHover: {value: 0},
    uDive: {value: 0},
    uVisibility: {value: 0},
    uRadii: {value: new Vector2(rx, rz)},
    uShoreNoise: {value: LAKE_CONFIG.shoreNoise},
    uShore: {value: shoreTexture},
    uShoreScale: {value: new Vector2(...field.uvScale)},
    uShoreOffset: {value: new Vector2(...field.uvOffset)},
    uClipToWorld: {value: new Matrix4()},
    uLevel: {value: level},
    uOccluderRise: {value: OCCLUDER_RISE},
    uWater: {value: new Color(LAKE_CONFIG.water)},
    uGold: {value: new Color(LAKE_CONFIG.gold)},
    uCyan: {value: new Color(LAKE_CONFIG.cyan)},
  }), [fadeStart, fadeEnd, field, level, rx, rz, shoreTexture]);

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
  const interactive = visible && state === 'idle';
  useFrame(({clock, camera}, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const step = Math.min(delta, 1 / 30);
    (material.uniforms.uClipToWorld.value as Matrix4).copy(camera.matrixWorld).multiply(camera.projectionMatrixInverse);
    material.uniforms.uLevel.value = level;
    const ready = !cameraFrameState.current.transitioning;
    reveal.current = advanceTextVisibility(reveal.current, interactive && ready, delta, reducedMotion,
      SCENE_LINK_EFFECT_CONFIG.dissolveInSpeed, SCENE_LINK_EFFECT_CONFIG.dissolveOutSpeed);
    const controls = controlsRef.current;
    if (controls) {
      const opacity = reveal.current.toFixed(3);
      if (controls.style.opacity !== opacity) {
        controls.style.opacity = opacity;
        controls.style.pointerEvents = reveal.current >= 1 ? '' : 'none';
      }
    }
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

  return (
    <group position={[cx, level, cz]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        frustumCulled={false}
        renderOrder={0}
        raycast={raycast}
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
          fog
        />
      </mesh>
      {interactive ? (
        <Html center zIndexRange={[30, 10]} position={[controlX, 0, controlZ]} calculatePosition={placeControls}>
          <div ref={controlsRef} className="flex flex-col items-center gap-2" style={{opacity: 0}}>
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
