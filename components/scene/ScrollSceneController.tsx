'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useThree } from '@react-three/fiber';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  CatmullRomCurve3,
  MathUtils,
  Matrix4,
  PerspectiveCamera,
  Quaternion,
  Vector3,
  type Fog,
  type ShaderMaterial,
} from 'three';
import { TERRAIN_CONFIG } from '@/config/terrain';

const UP_WORLD = new Vector3(0, 1, 0);
const UP_MAP = new Vector3(0, 0, 1);

type Props = {
  washRef: RefObject<HTMLDivElement | null>;
  onWashedChange: (washed: boolean) => void;
  cameraEnabled: boolean;
  endX: number;
  endY: number;
  endZ: number;
  endFov: number;
  endHeading: number;
  bow: number;
  scrubSeconds: number;
  fog: Fog | null;
  fogNearStart: number;
  fogFarStart: number;
  fogNearEnd: number;
  fogFarEnd: number;
  streamFadeStart: number;
  streamFadeEnd: number;
  decorativeMaterial: ShaderMaterial | null;
  linkMaterial: ShaderMaterial | null;
  domRefs: ScrollExperienceRefs;
};

export type ScrollExperienceRefs = {
  routeLayer: RefObject<HTMLDivElement | null>;
  routePath: RefObject<SVGPathElement | null>;
  splitLayer: RefObject<HTMLDivElement | null>;
  splitTop: RefObject<HTMLDivElement | null>;
  splitBottom: RefObject<HTMLDivElement | null>;
  splitContours: RefObject<SVGGElement | null>;
  transitionCards: RefObject<HTMLDivElement | null>;
};

/**
 * Owns the complete scroll transition. ScrollTrigger maps the semantic DOM
 * runway to one GSAP timeline; this controller applies that timeline directly
 * to Three.js objects and shader uniforms without a React/global progress bus.
 */
export function ScrollSceneController({
  washRef,
  onWashedChange,
  cameraEnabled,
  endX,
  endY,
  endZ,
  endFov,
  endHeading,
  bow,
  scrubSeconds,
  fog,
  fogNearStart,
  fogFarStart,
  fogNearEnd,
  fogFarEnd,
  streamFadeStart,
  streamFadeEnd,
  decorativeMaterial,
  linkMaterial,
  domRefs,
}: Props) {
  const camera = useThree((state) => state.camera);
  const washedRef = useRef(false);
  const cameraRef = useRef(camera);
  const fogRef = useRef(fog);
  const decorativeMaterialRef = useRef(decorativeMaterial);
  const linkMaterialRef = useRef(linkMaterial);

  useEffect(() => {
    cameraRef.current = camera;
    fogRef.current = fog;
    decorativeMaterialRef.current = decorativeMaterial;
    linkMaterialRef.current = linkMaterial;
  }, [camera, decorativeMaterial, fog, linkMaterial]);

  const cameraPath = useMemo(() => {
    const start = new Vector3(...TERRAIN_CONFIG.camera.position);
    const end = new Vector3(endX, endY, endZ);
    const midpoint = start.clone().lerp(end, 0.5);
    midpoint.x += bow;

    const curve = new CatmullRomCurve3([start, midpoint, end]);
    const startDirection = new Vector3(...TERRAIN_CONFIG.camera.lookAt);
    const startQuaternion = new Quaternion().setFromRotationMatrix(
      new Matrix4().lookAt(
        start,
        start.clone().add(startDirection),
        UP_WORLD,
      ),
    );
    const mapUp = UP_MAP.clone().applyAxisAngle(
      UP_WORLD,
      MathUtils.degToRad(-endHeading),
    );
    const endQuaternion = new Quaternion().setFromRotationMatrix(
      new Matrix4().lookAt(end, new Vector3(endX, 0, endZ), mapUp),
    );

    return { curve, startQuaternion, endQuaternion };
  }, [bow, endHeading, endX, endY, endZ]);

  useEffect(() => {
    const territory = document.getElementById('territory');
    const finale = document.getElementById('finale');
    const wash = washRef.current;
    const routeLayer = domRefs.routeLayer.current;
    const routePath = domRefs.routePath.current;
    const splitLayer = domRefs.splitLayer.current;
    const splitTop = domRefs.splitTop.current;
    const splitBottom = domRefs.splitBottom.current;
    const splitContours = domRefs.splitContours.current;
    const transitionCards = domRefs.transitionCards.current;
    if (
      !territory || !finale || !wash || !routeLayer
      || !routePath || !splitLayer || !splitTop || !splitBottom
      || !splitContours || !transitionCards
    ) return;

    const sceneCamera = cameraRef.current;
    const sceneFog = fogRef.current;
    const decorativeStreamMaterial = decorativeMaterialRef.current;
    const linkStreamMaterial = linkMaterialRef.current;

    gsap.registerPlugin(ScrollTrigger);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stations = Array.from(routeLayer.querySelectorAll<SVGGElement>('.experience-station'));
    const routeUserLength = routePath.getTotalLength();
    const routeMatrix = routePath.getScreenCTM();
    let routeLength = 0;
    let previousScreenPoint: { x: number; y: number } | null = null;
    for (let index = 0; index <= 180; index += 1) {
      const point = routePath.getPointAtLength((routeUserLength * index) / 180);
      const screenPoint = routeMatrix
        ? {
            x: point.x * routeMatrix.a + point.y * routeMatrix.c + routeMatrix.e,
            y: point.x * routeMatrix.b + point.y * routeMatrix.d + routeMatrix.f,
          }
        : { x: point.x, y: point.y };
      if (previousScreenPoint) {
        routeLength += Math.hypot(
          screenPoint.x - previousScreenPoint.x,
          screenPoint.y - previousScreenPoint.y,
        );
      }
      previousScreenPoint = screenPoint;
    }
    const routeDraw = { offset: routeLength };
    const stationArrival = stations.map((station) => {
      const marker = station.querySelectorAll('circle')[1];
      const markerX = Number(marker?.getAttribute('cx') ?? 0);
      const markerY = Number(marker?.getAttribute('cy') ?? 0);
      let closestDistance = 0;
      let closestSquaredDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index <= 240; index += 1) {
        const distance = (routeUserLength * index) / 240;
        const point = routePath.getPointAtLength(distance);
        const squaredDistance = (point.x - markerX) ** 2 + (point.y - markerY) ** 2;
        if (squaredDistance < closestSquaredDistance) {
          closestDistance = distance;
          closestSquaredDistance = squaredDistance;
        }
      }
      return closestDistance / routeUserLength;
    });

    const timelineState = { descent: 0, wash: 0, project: 0 };
    const setWashed = (next: boolean) => {
      if (washedRef.current === next) return;
      washedRef.current = next;
      onWashedChange(next);
    };
    const setStreamInteraction = (enabled: boolean) => {
      document.querySelectorAll<HTMLElement>('.stream-hit-target').forEach((target) => {
        target.style.pointerEvents = enabled ? 'auto' : 'none';
      });
    };
    const applyDescent = () => {
      const progress = timelineState.descent;

      if (cameraEnabled && !reducedMotion) {
        cameraPath.curve.getPoint(progress, sceneCamera.position);
        const poseProgress = MathUtils.smootherstep(
          progress,
          0,
          TERRAIN_CONFIG.descent.mapPoseCompleteAt,
        );
        sceneCamera.quaternion.slerpQuaternions(
          cameraPath.startQuaternion,
          cameraPath.endQuaternion,
          poseProgress,
        );
        if (sceneCamera instanceof PerspectiveCamera) {
          sceneCamera.fov = MathUtils.lerp(
            TERRAIN_CONFIG.camera.fov,
            endFov,
            poseProgress,
          );
          sceneCamera.updateProjectionMatrix();
        }
      }

      const fogProgress = Math.pow(
        progress,
        TERRAIN_CONFIG.descent.fogRevealPower,
      );
      if (sceneFog) {
        sceneFog.near = MathUtils.lerp(fogNearStart, fogNearEnd, fogProgress);
        sceneFog.far = MathUtils.lerp(fogFarStart, fogFarEnd, fogProgress);
      }

      const streamOpacity = 1 - MathUtils.smoothstep(
        progress,
        streamFadeStart,
        streamFadeEnd,
      );
      if (decorativeStreamMaterial) {
        decorativeStreamMaterial.uniforms.uFade.value = streamOpacity;
      }
      if (linkStreamMaterial) {
        linkStreamMaterial.uniforms.uFade.value = streamOpacity;
      }
      setStreamInteraction(progress < streamFadeEnd);
    };
    const applyWash = () => {
      wash.style.opacity = String(timelineState.wash);
      setWashed(timelineState.wash >= 0.9999);
    };

    wash.style.opacity = '0';
    setWashed(false);
    applyDescent();

    gsap.set(routeLayer, { autoAlpha: 0 });
    gsap.set(routePath, {
      strokeDasharray: `${routeLength}px ${routeLength}px`,
      strokeDashoffset: `${routeLength}px`,
    });
    gsap.set(stations, { autoAlpha: 0, scale: 0.55 });
    gsap.set(splitLayer, { autoAlpha: 0 });
    gsap.set([splitTop, splitBottom], {
      clipPath: 'inset(0% 9% 0% 9%)',
      y: 0,
    });
    gsap.set(splitContours, { autoAlpha: 0 });
    gsap.set(transitionCards, { autoAlpha: 0, y: 18 });

    const routeStart = TERRAIN_CONFIG.descent.scrollSvh * 0.72;
    const routeDuration = TERRAIN_CONFIG.descent.scrollSvh - routeStart;
    const washStart =
      TERRAIN_CONFIG.descent.scrollSvh + TERRAIN_CONFIG.descent.mapHoldSvh;
    const projectStart = washStart + TERRAIN_CONFIG.descent.washSvh;

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: territory,
        start: 'top top',
        endTrigger: finale,
        end: 'top top',
        scrub: reducedMotion ? true : scrubSeconds,
        invalidateOnRefresh: true,
      },
    });
    timeline.to(timelineState, {
      descent: 1,
      duration: TERRAIN_CONFIG.descent.scrollSvh,
      ease: 'none',
      onUpdate: applyDescent,
    }, 0);
    timeline.to(timelineState, {
      wash: 1,
      duration: TERRAIN_CONFIG.descent.washSvh,
      ease: 'none',
      onUpdate: applyWash,
    }, TERRAIN_CONFIG.descent.scrollSvh + TERRAIN_CONFIG.descent.mapHoldSvh);
    timeline.to(routeLayer, {
      autoAlpha: 1,
      duration: Math.min(10, routeDuration * 0.22),
      ease: 'none',
    }, routeStart);
    timeline.to(routeDraw, {
      offset: 0,
      duration: routeDuration,
      ease: 'none',
      onUpdate: () => {
        gsap.set(routePath, { strokeDashoffset: `${routeDraw.offset}px` });
      },
    }, routeStart);
    stations.forEach((station, index) => {
      timeline.to(station, {
        autoAlpha: 1,
        scale: 1,
        duration: routeDuration * 0.055,
        ease: 'back.out(2)',
      }, routeStart + routeDuration * stationArrival[index]);
    });

    timeline.to(splitLayer, {
      autoAlpha: 1,
      duration: 7,
      ease: 'none',
    }, washStart);
    timeline.to(routeLayer, {
      autoAlpha: 0,
      duration: 8,
      ease: 'none',
    }, washStart + 1);
    timeline.to(splitTop, {
      clipPath: 'inset(0% 0% 0% 0%)',
      y: () => -window.innerHeight * (window.innerWidth < 720 ? 0.31 : 0.23),
      duration: TERRAIN_CONFIG.descent.washSvh,
      ease: 'power2.inOut',
    }, washStart);
    timeline.to(splitBottom, {
      clipPath: 'inset(0% 0% 0% 0%)',
      y: () => window.innerHeight * (window.innerWidth < 720 ? 0.31 : 0.23),
      duration: TERRAIN_CONFIG.descent.washSvh,
      ease: 'power2.inOut',
    }, washStart);
    timeline.to(splitContours, {
      autoAlpha: 1,
      duration: TERRAIN_CONFIG.descent.washSvh * 0.55,
      ease: 'none',
    }, washStart + TERRAIN_CONFIG.descent.washSvh * 0.35);
    timeline.to(transitionCards, {
      autoAlpha: 1,
      y: 0,
      duration: TERRAIN_CONFIG.descent.washSvh * 0.42,
      ease: 'power2.out',
    }, washStart + TERRAIN_CONFIG.descent.washSvh * 0.5);
    timeline.to(timelineState, {
      project: 1,
      duration: TERRAIN_CONFIG.descent.projectSvh,
      ease: 'none',
    }, projectStart);

    ScrollTrigger.refresh();

    return () => {
      timeline.scrollTrigger?.kill();
      timeline.kill();
      gsap.set(
        [routeLayer, routePath, ...stations, splitLayer, splitTop,
          splitBottom, splitContours, transitionCards],
        { clearProps: 'all' },
      );
      document.querySelectorAll<HTMLElement>('.stream-hit-target').forEach((target) => {
        target.style.pointerEvents = '';
      });
    };
  }, [
    camera,
    cameraEnabled,
    cameraPath,
    decorativeMaterial,
    endFov,
    fog,
    fogFarEnd,
    fogFarStart,
    fogNearEnd,
    fogNearStart,
    linkMaterial,
    domRefs,
    onWashedChange,
    scrubSeconds,
    streamFadeEnd,
    streamFadeStart,
    washRef,
  ]);

  return null;
}
