// The dive: the crack's walls under the lake, imaged by sonar pings (crack.frag), the bottle resting on the
// basin's floor at the bottom, and the camera: the flight from the overview down to the water, the craft's own
// view in the crack (direction by the player alone, speed fixed), and the flight back up. Reads the HUD's input
// and writes its telemetry every frame (components/lake/lakeState.ts).
'use client';

import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useMemo, useRef, type MutableRefObject} from 'react';
import {
  AdditiveBlending, BufferGeometry, Color, CylinderGeometry, Euler, LatheGeometry, MathUtils,
  NoColorSpace, PlaneGeometry, Quaternion, RepeatWrapping, TextureLoader, Vector2, Vector3, Vector4, type Group,
  type Mesh, type ShaderMaterial, type Texture,
} from 'three';
import {createLakeTelemetry, isUnderwater, type LakeInput, type LakeState, type LakeTelemetry}
  from '@/components/lake/lakeState';
import type {LakeControlValues} from '@/components/scene/controls/useSceneControls';
import {createSonar} from '@/lib/lake/sonarSound';
import {getCameraPose, SCENE_LAYOUT_CONFIG} from '@/config/scene';
import {LAKE_CONFIG, LAKE_DIVE_CONFIG, LAKE_FLOW, lakePlacement} from '@/config/scene/lake';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {
  advanceCraft, createCraft, createLocus, CrackRoute, headingDirection, type CraftState,
} from '@/lib/scene/lake';
import fragmentShader from '@/shaders/lake/crack.frag';
import glowFragmentShader from '@/shaders/lake/crackGlow.frag';
import vertexShader from '@/shaders/lake/crack.vert';
import {BLOOM_LAYER} from '../effects/IsolatedBloom';
import {useCrackGeometry} from './useCrackGeometry';

const UP = new Vector3(0, 1, 0);
const EMPTY = new BufferGeometry();
const CFG = LAKE_DIVE_CONFIG;
const SCAN_SECONDS = 1.3;

const bottleVertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPosition = world.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

// The pings' light on the bottle: how much has reached it and how recently, and a glint where a ping's return
// comes straight back.
const bottlePingsGlsl = /* glsl */ `
  #define MAX_PINGS 6
  uniform float uTime;
  uniform vec4 uPings[MAX_PINGS];
  uniform int uPingCount;
  uniform float uPingSpeed;
  uniform float uPingDecay;
  uniform float uPingRange;
  uniform float uFade;
  uniform float uFound;
  uniform float uHaloReach; // units within which the bottle's own light shows: further off, the water stays void
  uniform vec3 uGold;
  uniform vec3 uCyan;
  void pingLight(vec3 position, vec3 normal, out float lit, out float glint) {
    lit = 0.0;
    glint = 0.0;
    for (int i = 0; i < MAX_PINGS; i++) {
      if (i >= uPingCount) break;
      vec4 ping = uPings[i];
      vec3 fromPing = position - ping.xyz;
      float d = length(fromPing);
      float behind = (uTime - ping.w) * uPingSpeed - d;
      if (behind < 0.0) continue;
      float facing = max(dot(normal, -fromPing / max(d, 1e-3)), 0.0);
      float fade = exp(-behind / (uPingSpeed * uPingDecay));
      lit += fade * exp(-d / uPingRange) * (0.4 + 0.6 * facing);
      glint += fade * pow(facing, 18.0);
    }
  }
`;

// The bottle: glass drawn additively (a bright rim, the inside seen through), the rolled letter warm inside it,
// the cork dim; a slow breath of light from within, stronger once found.
const bottleFragmentShader = /* glsl */ `
  ${bottlePingsGlsl}
  uniform float uPart; // 0 glass, 1 the letter, 2 the cork
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 toCamera = normalize(cameraPosition - vWorldPosition);
    float facing = max(dot(normal, toCamera), 0.0);
    float rim = pow(1.0 - facing, 2.6);
    float lit, glint;
    pingLight(vWorldPosition, normal, lit, glint);
    float pulse = 0.5 + 0.5 * sin(uTime * 1.6);
    float reach = exp(-distance(cameraPosition, vWorldPosition) / uHaloReach);
    float beacon = (0.35 + 0.65 * pulse) * (0.6 + 0.8 * uFound) * reach;
    vec3 color;
    if (uPart < 0.5) {
      // Glass: the rim in cyan, the pings glinting on it, a little of the letter's gold through the middle.
      color = uCyan * (rim * (0.5 + 0.9 * lit) + glint * 0.6 + facing * 0.03 * lit)
        + uGold * (rim * 0.25 * beacon + (1.0 - rim) * 0.07 * beacon);
    } else if (uPart < 1.5) {
      // The letter: warm, lit from within, the pings' light over it.
      color = uGold * (0.3 * reach + 0.45 * lit + 0.55 * beacon * (0.6 + 0.4 * facing)) + uCyan * 0.04 * lit;
    } else {
      color = uGold * (0.1 * reach + 0.3 * lit + 0.1 * beacon) * (0.5 + 0.5 * facing);
    }
    gl_FragColor = vec4(color * uFade, 1.0);
  }
`;

// The halo about the bottle: a soft light in the water around it, gold at the heart and cyan at its fringe, that
// breathes, answers each ping that reaches it and swells once found; the one thing in the basin seen from afar.
const haloVertexShader = /* glsl */ `
  uniform float uSize;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 centre = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    centre.xy += (uv - 0.5) * uSize;
    gl_Position = projectionMatrix * centre;
  }
`;

const haloFragmentShader = /* glsl */ `
  ${bottlePingsGlsl}
  uniform vec3 uCentre;
  varying vec2 vUv;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float reach = exp(-distance(cameraPosition, uCentre) / uHaloReach);
    float lit, glint;
    pingLight(uCentre, vec3(0.0, 1.0, 0.0), lit, glint);
    float pulse = 0.5 + 0.5 * sin(uTime * 1.6);
    float beacon = (0.4 + 0.6 * pulse) * (0.5 + 1.0 * uFound);
    float heart = exp(-r * r * 14.0);
    float glow = exp(-r * r * 3.0) * (1.0 - r * 0.6);
    vec3 color = uGold * heart * (0.9 * beacon + 0.8 * lit) + uCyan * glow * (0.12 * beacon + 0.35 * lit);
    gl_FragColor = vec4(color * uFade * reach * (1.0 - smoothstep(0.85, 1.0, r)), 1.0);
  }
`;

type LakeDiveProps = {
  state: LakeState;
  /** The feel and the sonar, live from Leva (the config's values in production). */
  settings: LakeControlValues;
  inputRef: MutableRefObject<LakeInput>;
  telemetryRef: MutableRefObject<LakeTelemetry>;
  onCrackMesh: (mesh: Mesh | null) => void;
  onBottleMesh: (mesh: Mesh | null) => void;
  onFound: () => void;
};

export function LakeDive({
  state, settings, inputRef, telemetryRef, onCrackMesh, onBottleMesh, onFound,
}: LakeDiveProps) {
  const groupRef = useRef<Group>(null);
  const bottleRef = useRef<Group>(null);
  // The walls' material holds the ping uniforms the bottle's materials share; they are written through it.
  const wallsMaterial = useRef<ShaderMaterial>(null);
  const bottleMaterial = useRef<ShaderMaterial>(null);
  const reducedMotion = useReducedMotion();
  const viewportWidth = useThree((s) => s.size.width);
  const isMobile = viewportWidth < SCENE_LAYOUT_CONFIG.mobileMaxWidth;

  const placement = useMemo(() => lakePlacement(), []);
  const route = useMemo(() => new CrackRoute(CFG, placement), [placement]);
  const sonar = useMemo(() => createSonar(CFG.soundSrc), []);
  useEffect(() => () => sonar.dispose(), [sonar]);
  // The walls, laid out from the bake once the page is idle; null until then (the dive draws no walls).
  const geometry = useCrackGeometry(route);
  // The bottle: one lathed glass (a rounded base, shoulders, a neck with a lip), the letter rolled inside, a cork,
  // and the halo's plane. The base sits at y = 0.
  const bottleGeometry = useMemo(() => {
    const profile = [
      [0, 0], [0.16, 0.01], [0.21, 0.05], [0.235, 0.16], [0.235, 0.5], [0.215, 0.6], [0.13, 0.7], [0.085, 0.76],
      [0.08, 0.98], [0.095, 1.0], [0.095, 1.04], [0.075, 1.05], [0, 1.05],
    ].map(([x, y]) => new Vector2(x, y));
    const glass = new LatheGeometry(profile, 28);
    const cork = new CylinderGeometry(0.062, 0.068, 0.16, 12, 1, false);
    cork.translate(0, 1.06, 0);
    const letter = new CylinderGeometry(0.075, 0.075, 0.58, 12, 1, false);
    letter.rotateZ(0.12);
    letter.translate(0.02, 0.36, 0);
    const halo = new PlaneGeometry(1, 1);
    return {glass, cork, letter, halo};
  }, []);
  useEffect(() => () => {
    for (const part of Object.values(bottleGeometry)) part.dispose();
  }, [bottleGeometry]);


  // The scanned rock on the walls, loaded once the player heads for the water (the overview never needs it); the
  // walls stand flat until it arrives.
  const rockUniforms = useMemo(() => ({
    uRock: {value: null as Texture | null},
    uRockReady: {value: 0},
    uRockScale: {value: CFG.rockScale as number},
    uRockDetailScale: {value: CFG.rockDetailScale as number},
    uRockBump: {value: CFG.rockBump as number},
    uRockOcclusion: {value: CFG.rockOcclusion as number},
    uRockRelief: {value: CFG.rockRelief as number},
  }), []);
  const rockWanted = state !== 'idle';
  useEffect(() => {
    if (!rockWanted || rockUniforms.uRock.value) return;
    let disposed = false;
    const loader = new TextureLoader();
    loader.load(CFG.rockTexture, (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      texture.colorSpace = NoColorSpace;
      texture.wrapS = texture.wrapT = RepeatWrapping;
      texture.anisotropy = 2;
      rockUniforms.uRock.value = texture;
      rockUniforms.uRockReady.value = 1;
    });
    return () => {
      disposed = true;
    };
  }, [rockUniforms, rockWanted]);
  useEffect(() => () => {
    rockUniforms.uRock.value?.dispose();
  }, [rockUniforms]);

  // Shared by the walls and the bottle: the pings and the clock.
  const pingUniforms = useMemo(() => ({
    uTime: {value: 0},
    uPings: {value: Array.from({length: CFG.maxPings}, () => new Vector4(0, 0, 0, -1000))},
    uPingCount: {value: 0},
    uPingSpeed: {value: CFG.pingSpeed as number},
    uPingDecay: {value: CFG.pingDecay},
    uPingRange: {value: CFG.pingRange},
    uFloorRange: {value: CFG.floorRange as number},
    uFade: {value: 0},
  }), []);
  const wallUniforms = useMemo(() => ({
    ...pingUniforms,
    ...rockUniforms,
    uDepthLines: {value: CFG.depthLines},
    uAmbient: {value: CFG.ambient},
    uAmbientReach: {value: CFG.ambientReach},
    uGold: {value: new Color(LAKE_CONFIG.gold)},
    uCyan: {value: new Color(LAKE_CONFIG.cyan)},
  }), [pingUniforms, rockUniforms]);
  const bottleUniforms = useMemo(() => ({
    ...pingUniforms,
    uFound: {value: 0},
    uHaloReach: {value: CFG.haloReach as number},
    uPart: {value: 0},
    uGold: {value: new Color(LAKE_CONFIG.gold)},
    uCyan: {value: new Color(LAKE_CONFIG.cyan)},
  }), [pingUniforms]);
  const letterUniforms = useMemo(() => ({...bottleUniforms, uPart: {value: 1}}), [bottleUniforms]);
  const corkUniforms = useMemo(() => ({...bottleUniforms, uPart: {value: 2}}), [bottleUniforms]);
  const haloUniforms = useMemo(() => ({
    ...bottleUniforms,
    uSize: {value: 2.6},
    uCentre: {value: route.bottle.clone().add(new Vector3(0, 0.3, 0))},
  }), [bottleUniforms, route]);
  // The letter and the halo glow in the bloom with the glass (which SceneCanvas selects).
  const glowParts = useRef<(Mesh | null)[]>([]);
  useEffect(() => {
    for (const part of glowParts.current) part?.layers.enable(BLOOM_LAYER);
  }, []);
  // The walls' glow twin for the bloom pass: the same geometry and ping uniforms, a far cheaper shader, on the
  // bloom layer alone (the main pass never draws it, the bloom pass draws it instead of the walls).
  const glowUniforms = useMemo(() => ({
    ...pingUniforms,
    ...rockUniforms,
    uDepthLines: {value: CFG.depthLines},
    uGold: {value: new Color(LAKE_CONFIG.gold)},
    uCyan: {value: new Color(LAKE_CONFIG.cyan)},
  }), [pingUniforms, rockUniforms]);
  const glowRef = useRef<Mesh>(null);
  useEffect(() => {
    glowRef.current?.layers.set(BLOOM_LAYER);
  }, []);


  // The craft and the camera's flights.
  const craft = useRef<CraftState | null>(null);
  const locus = useMemo(() => createLocus(), []);
  const previousState = useRef<LakeState>(state);
  const flight = useRef({elapsed: 0, fromPosition: new Vector3(), fromQuaternion: new Quaternion()});
  const look = useRef({yaw: 0, pitch: 0, roll: 0});
  const pings = useRef<{position: Vector3; at: number; left: number; right: number}[]>([]);
  const lastPing = useRef(-1000);
  const lastManualPing = useRef(-1000);
  const fade = useRef(0);
  const found = useRef(false);
  const knocking = useRef(false);
  const lastContact = useRef(-1000);
  const foundAt = useRef(0);
  const divingSince = useRef(0);
  const scratch = useMemo(() => ({
    position: new Vector3(), lookAt: new Vector3(), quaternion: new Quaternion(), euler: new Euler(),
    heading: new Vector3(), right: new Vector3(), left: new Vector3(), toBottle: new Vector3(), bottle: new Vector3(),
  }), []);

  const sendPing = (camera: {position: Vector3; quaternion: Quaternion}, now: number, manual: boolean) => {
    const uniforms = wallsMaterial.current?.uniforms;
    if (!uniforms) return;
    const {right, left, position} = scratch;
    right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    left.copy(right).negate();
    position.copy(camera.position);
    const leftDistance = route.wallDistance(position, left, CFG.readoutRange, locus, craft.current?.hint ?? -1);
    const rightDistance = route.wallDistance(position, right, CFG.readoutRange, locus, craft.current?.hint ?? -1);
    sonar.ping(settings.soundVolume);
    const list = pings.current;
    if (list.length >= CFG.maxPings) list.shift();
    list.push({position: position.clone(), at: now, left: leftDistance, right: rightDistance});
    lastPing.current = now;
    if (manual) lastManualPing.current = now;
    const values = uniforms.uPings.value as Vector4[];
    for (let i = 0; i < values.length; i++) {
      const ping = list[i];
      if (ping) values[i].set(ping.position.x, ping.position.y, ping.position.z, ping.at);
      else values[i].set(0, 0, 0, -1000);
    }
    uniforms.uPingCount.value = list.length;
  };

  // The camera's own frame: after CameraRig (-0.75), before the frame state (-0.5) and the terrain cache.
  useFrame(({camera, clock}, delta) => {
    const uniforms = wallsMaterial.current?.uniforms;
    const bottleValues = bottleMaterial.current?.uniforms;
    if (!uniforms || !bottleValues) return;
    const now = clock.elapsedTime;
    const telemetry = telemetryRef.current;
    const input = inputRef.current;
    const underwater = isUnderwater(state);
    uniforms.uTime.value = now;
    uniforms.uPingSpeed.value = reducedMotion ? 400 : settings.pingSpeed;
    uniforms.uPingDecay.value = settings.pingDecay;
    uniforms.uPingRange.value = settings.pingRange;
    uniforms.uAmbient.value = settings.ambient;
    uniforms.uAmbientReach.value = settings.ambientReach;
    // The rock uniforms are the same objects in the glow twin's material, so one write reaches both.
    uniforms.uRockScale.value = settings.rockScale;
    uniforms.uRockBump.value = settings.rockBump;
    uniforms.uRockRelief.value = settings.rockRelief;
    uniforms.uRockOcclusion.value = settings.rockOcclusion;

    if (state !== previousState.current) {
      const from = previousState.current;
      previousState.current = state;
      if (state === 'entering') {
        flight.current.elapsed = 0;
        flight.current.fromPosition.copy(camera.position);
        flight.current.fromQuaternion.copy(camera.quaternion);
      } else if (state === 'diving' && from !== 'found') {
        const fresh = createCraft(route);
        craft.current = fresh;
        look.current = {yaw: fresh.yaw, pitch: fresh.pitch, roll: 0};
        pings.current = [];
        uniforms.uPingCount.value = 0;
        // One ping is sent for the player as the crack comes into view; the rest are theirs.
        lastPing.current = now + CFG.firstPingAt - CFG.pingCooldown;
        lastManualPing.current = -1000;
        found.current = false;
        divingSince.current = now;
        Object.assign(telemetry, createLakeTelemetry());
        input.ping = false;
        input.skip = false;
      } else if (state === 'found') {
        foundAt.current = now;
      } else if (state === 'returning') {
        flight.current.elapsed = 0;
        flight.current.fromPosition.fromArray(placement.divePosition);
        scratch.lookAt.fromArray(placement.diveLookAt);
        camera.position.copy(flight.current.fromPosition);
        camera.lookAt(scratch.lookAt);
        flight.current.fromQuaternion.copy(camera.quaternion);
      }
    }

    // The crack is drawn only under water, fading in as the veil lifts and out as it falls.
    if (state !== 'diving') sonar.contact(false, 0);
    const fadeTarget = state === 'diving' || state === 'found' ? 1 : 0;
    fade.current += (fadeTarget - fade.current) * (1 - Math.exp(-(fadeTarget ? 2.2 : 5) * Math.min(delta, 1 / 20)));
    uniforms.uFade.value = fade.current;
    if (groupRef.current) groupRef.current.visible = underwater && fade.current > 0.001;
    bottleValues.uFound.value += ((state === 'found' ? 1 : 0) - bottleValues.uFound.value)
      * (1 - Math.exp(-2 * Math.min(delta, 1 / 20)));

    if (state === 'entering' || state === 'returning') {
      const seconds = state === 'entering' ? LAKE_FLOW.entryFlight : LAKE_FLOW.returnFlight;
      flight.current.elapsed += delta;
      const t = reducedMotion ? 1 : MathUtils.smootherstep(Math.min(flight.current.elapsed / seconds, 1), 0, 1);
      const {position, lookAt, quaternion} = scratch;
      if (state === 'entering') {
        position.fromArray(placement.divePosition);
        lookAt.fromArray(placement.diveLookAt);
      } else {
        const pose = getCameraPose(null, isMobile);
        position.fromArray(pose.position);
        lookAt.fromArray(pose.lookAt);
      }
      camera.position.copy(position);
      camera.lookAt(lookAt);
      quaternion.copy(camera.quaternion);
      camera.position.lerpVectors(flight.current.fromPosition, position, t);
      camera.quaternion.slerpQuaternions(flight.current.fromQuaternion, quaternion, t);
      return;
    }
    if (!underwater || !craft.current) return;

    const current = craft.current;
    const dt = Math.min(delta, 1 / 20);
    // A finished dive may jump to the basin.
    if (input.skip) {
      input.skip = false;
      if (state === 'diving') {
        // Land a way before the bottle, facing it, and send the scan that reveals it: the dive ends there.
        route.placeCraftBeforeBottle(current, Math.min(settings.foundRange * 0.7, 12));
        look.current = {yaw: current.yaw, pitch: current.pitch, roll: 0};
        camera.position.copy(current.position);
        headingDirection(current.yaw, current.pitch, scratch.heading);
        scratch.lookAt.copy(camera.position).add(scratch.heading);
        camera.up.copy(UP);
        camera.lookAt(scratch.lookAt);
        pings.current = [];
        uniforms.uPingCount.value = 0;
        sendPing(camera, now, false);
        lastManualPing.current = now;
      }
    }
    // The craft: steered by the player until the bottle is in reach, then drifting to a stop before it.
    let bumped = false;
    const feel = {
      ...CFG, speed: settings.speed, basinSpeed: settings.basinSpeed, turnRate: settings.turnRate,
      pitchRate: settings.pitchRate,
    };
    if (state === 'diving') {
      bumped = advanceCraft(current, {yaw: input.yaw, pitch: input.pitch}, route, locus, delta, settings.speed, feel);
      // The dive ends when a scan has reached the bottle while it lies ahead within the found range, or when the
      // craft is right on it whatever the scan showed.
      const bottleDistance = current.position.distanceTo(route.bottle);
      let revealed = false;
      if (bottleDistance < settings.foundRange) {
        headingDirection(current.yaw, current.pitch, scratch.heading);
        scratch.toBottle.subVectors(route.bottle, current.position).normalize();
        if (scratch.toBottle.dot(scratch.heading) > CFG.foundCone) {
          for (const ping of pings.current) {
            const reach = (now - ping.at) * (uniforms.uPingSpeed.value as number);
            if (reach >= ping.position.distanceTo(route.bottle)) revealed = true;
          }
        }
      }
      if (!found.current && (revealed || bottleDistance < CFG.reach)) {
        found.current = true;
        onFound();
      }
    } else {
      current.speedScale *= Math.exp(-2.5 * dt);
    }

    // The view: the camera lags a little behind the heading and leans into a turn; found, it turns to the bottle.
    const ease = reducedMotion ? 1 : 1 - Math.exp(-CFG.lookEase * dt);
    let targetYaw = current.yaw;
    let targetPitch = current.pitch;
    if (state !== 'diving') {
      scratch.toBottle.subVectors(route.bottle, current.position).normalize();
      targetYaw = Math.atan2(scratch.toBottle.x, scratch.toBottle.z);
      targetPitch = Math.asin(MathUtils.clamp(scratch.toBottle.y, -1, 1));
    }
    const view = look.current;
    view.yaw += (targetYaw - view.yaw - Math.round((targetYaw - view.yaw) / (Math.PI * 2)) * Math.PI * 2) * ease;
    view.pitch += (targetPitch - view.pitch) * ease;
    // Yaw grows to the left; a left turn banks the view left (a positive roll).
    const leanTarget = reducedMotion || state !== 'diving' ? 0 : current.yawVelocity * CFG.lean;
    view.roll += (leanTarget - view.roll) * ease;
    camera.position.copy(current.position);
    headingDirection(view.yaw, view.pitch, scratch.heading);
    scratch.lookAt.copy(camera.position).add(scratch.heading);
    camera.up.copy(UP);
    camera.lookAt(scratch.lookAt);
    if (view.roll !== 0) camera.rotateZ(view.roll);

    // Pings: the player's, on a cooldown, after the one sent at the start.
    const wantsPing = input.ping;
    input.ping = false;
    if (state === 'diving') {
      if (wantsPing && now - lastManualPing.current >= settings.pingCooldown) sendPing(camera, now, true);
      else if (pings.current.length === 0 && now >= lastPing.current + CFG.pingCooldown) {
        sendPing(camera, now, false);
      }
    }

    // Telemetry for the HUD. The readouts are live, a passive sounding each side every frame; a ping in flight
    // caps them at its front, so they count up as it travels.
    const metres = CFG.metresPerUnit;
    scratch.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    scratch.left.copy(scratch.right).negate();
    const liveLeft = route.wallDistance(camera.position, scratch.left, CFG.readoutRange, locus, current.hint);
    const liveRight = route.wallDistance(camera.position, scratch.right, CFG.readoutRange, locus, current.hint);
    const latest = pings.current[pings.current.length - 1];
    const reach = latest ? (now - latest.at) * (uniforms.uPingSpeed.value as number) : Infinity;
    const inFlight = latest !== undefined && reach < Math.max(liveLeft, liveRight) + 2;
    telemetry.left = Math.min(reach, liveLeft) * metres;
    telemetry.right = Math.min(reach, liveRight) * metres;
    telemetry.leftFresh = inFlight ? 1 : 0.55;
    telemetry.rightFresh = inFlight ? 1 : 0.55;
    telemetry.measured = 0;
    telemetry.scanning = Math.max(0, 1 - (now - lastPing.current) / SCAN_SECONDS);
    telemetry.cooldown = Math.min(1, (now - lastManualPing.current) / settings.pingCooldown);
    // A knock: the first frame of contact jolts the view; the system's warning sounds for as long as the contact
    // lasts (a short grace bridges the frames a slide lets go); the HUD's mark eases in and out rather than
    // toggling frame by frame.
    if (bumped && !knocking.current && !reducedMotion) {
      const strength = Math.min(1, 0.5 + current.speedScale);
      look.current.roll += (Math.random() < 0.5 ? -1 : 1) * CFG.bumpKick * strength;
      look.current.pitch -= CFG.bumpKick * 0.5 * strength;
    }
    knocking.current = bumped;
    if (bumped) lastContact.current = now;
    sonar.contact(now - lastContact.current < 0.4, settings.soundVolume);
    telemetry.bump = bumped ? Math.min(1, telemetry.bump + dt * 8) : Math.max(0, telemetry.bump - dt * 1.2);
    telemetry.depth = Math.max(0, (placement.level - current.position.y) * metres);
    const pace = locus.s > route.length - CFG.basin - 3 ? settings.basinSpeed : 1;
    telemetry.speed = settings.speed * pace * current.speedScale * metres;
    telemetry.progress = MathUtils.clamp(locus.s / route.length, 0, 1);
    // Only the stretch of walls about the craft is drawn (the walls and their glow twin share the geometry): rock
    // further along is beyond the sonar and sunk in the water, and the trench is long.
    if (geometry) {
      const ring = CFG.ringSegments;
      const reach = Math.round(CFG.drawReach / CFG.stationSpacing);
      const from = Math.max(0, current.hint - reach);
      const to = Math.min(route.stations.length - 1, current.hint + reach);
      geometry.setDrawRange(from * ring * 6, (to - from) * ring * 6);
    }
    telemetry.heading = (MathUtils.radToDeg(current.yaw) % 360 + 360) % 360;
    telemetry.pitch = MathUtils.radToDeg(current.pitch);

    // The bottle lies on its side on the basin's floor, still but for the water's slightest rock.
    const bottle = bottleRef.current;
    if (bottle) {
      bottle.position.copy(route.bottle);
      const rock = reducedMotion ? 0 : Math.sin(now * 0.45) * 0.015;
      bottle.rotation.set(1.3 + rock, 0.9, 0.25 + rock);
    }
  }, -0.74);

  return (
    <group ref={groupRef} visible={false}>
      {/* With no walls yet, an empty geometry keeps the materials (and the ping uniforms written through them). */}
      <mesh geometry={geometry ?? EMPTY} frustumCulled={false}>
        <shaderMaterial
          ref={wallsMaterial}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={wallUniforms}
        />
      </mesh>
      <mesh
        ref={(mesh) => {
          glowRef.current = mesh;
          onCrackMesh(mesh);
        }}
        geometry={geometry ?? EMPTY}
        frustumCulled={false}
      >
        <shaderMaterial vertexShader={vertexShader} fragmentShader={glowFragmentShader} uniforms={glowUniforms} />
      </mesh>
      <group ref={bottleRef}>
        <mesh ref={(mesh) => { glowParts.current[0] = mesh; }} geometry={bottleGeometry.letter} renderOrder={1}>
          <shaderMaterial vertexShader={bottleVertexShader} fragmentShader={bottleFragmentShader}
            uniforms={letterUniforms} />
        </mesh>
        <mesh geometry={bottleGeometry.cork} renderOrder={1}>
          <shaderMaterial vertexShader={bottleVertexShader} fragmentShader={bottleFragmentShader}
            uniforms={corkUniforms} />
        </mesh>
        <mesh ref={onBottleMesh} geometry={bottleGeometry.glass} renderOrder={2}>
          <shaderMaterial ref={bottleMaterial} vertexShader={bottleVertexShader} fragmentShader={bottleFragmentShader}
            uniforms={bottleUniforms} transparent blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
      <mesh
        ref={(mesh) => { glowParts.current[1] = mesh; }}
        geometry={bottleGeometry.halo}
        position={haloUniforms.uCentre.value}
        renderOrder={3}
        frustumCulled={false}
      >
        <shaderMaterial vertexShader={haloVertexShader} fragmentShader={haloFragmentShader} uniforms={haloUniforms}
          transparent blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}
