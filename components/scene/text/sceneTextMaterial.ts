// Shared material setup for scene text (shaders/text/sceneText.*): scene links and the hero name.
import {useEffect, type RefObject} from 'react';
import {Color, type ShaderMaterial, type Texture} from 'three';
import type {ContourControlValues} from '@/components/scene/controls/useSceneControls';
import {CONTOUR_CONFIG, TERRAIN_MATERIAL_CONFIG, TERRAIN_MESH_CONFIG} from '@/config/scene';
import vertexShader from '@/shaders/text/sceneText.vert';

export {default as sceneTextFragmentShader} from '@/shaders/text/sceneText.frag';

/** The vertex shader sizes its per-link uniform arrays from this count. */
export function sceneTextVertexShader(count: number) {
  return vertexShader.replace('__LINK_STREAM_COUNT__', String(count));
}

type SceneTextUniformOptions = {
  atlas: Texture;
  heightmap: Texture;
  lift: number;
  hover: Float32Array;
  glitch: Float32Array;
  textTarget: Float32Array;
  layoutOffsetX: Float32Array;
  layoutOffsetZ: Float32Array;
  verticalOffset: Float32Array;
  focusedSpacingMultiplier: number;
  billboardTilt: number;
  jiggleStrength: number;
  sequencedLetterSwap: number;
};

export function createSceneTextUniforms(options: SceneTextUniformOptions) {
  return {
    heightmap: {value: options.heightmap},
    elevation: {value: TERRAIN_MATERIAL_CONFIG.elevation},
    contrast: {value: TERRAIN_MATERIAL_CONFIG.contrast},
    seaLevel: {value: TERRAIN_MATERIAL_CONFIG.seaLevel},
    planeSize: {value: TERRAIN_MESH_CONFIG.planeSize},
    meshY: {value: TERRAIN_MESH_CONFIG.position[1]},
    uLift: {value: options.lift},
    uTime: {value: 0},
    uHover: {value: options.hover},
    uGlitch: {value: options.glitch},
    uTextTarget: {value: options.textTarget},
    uLayoutOffsetX: {value: options.layoutOffsetX},
    uLayoutOffsetZ: {value: options.layoutOffsetZ},
    uVerticalOffset: {value: options.verticalOffset},
    uDissolve: {value: 0},
    uActiveStream: {value: -1},
    uFocused: {value: 0},
    uFocusedSpacingMultiplier: {value: options.focusedSpacingMultiplier},
    uBillboardTilt: {value: options.billboardTilt},
    uJiggleStrength: {value: options.jiggleStrength},
    uSequencedLetterSwap: {value: options.sequencedLetterSwap},
    uAtlas: {value: options.atlas},
    uDecorationColor: {value: new Color(CONTOUR_CONFIG.minorColor)},
    uStreamColor: {value: new Color(CONTOUR_CONFIG.majorColor)},
    uHotColor: {value: new Color(CONTOUR_CONFIG.pulseColor)},
  };
}

/** Keep terrain placement and contour-derived colours in step with the live controls. */
export function useSceneTextSettings(
  materialRef: RefObject<ShaderMaterial | null>,
  contourSettings: ContourControlValues,
  elevation: number,
  seaLevel: number,
) {
  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.elevation.value = elevation;
    material.uniforms.seaLevel.value = seaLevel;
    material.uniforms.uDecorationColor.value.set(contourSettings.minorColor);
    material.uniforms.uStreamColor.value.set(contourSettings.majorColor);
    material.uniforms.uHotColor.value.set(contourSettings.pulseColor);
  }, [
    contourSettings.majorColor,
    contourSettings.minorColor,
    contourSettings.pulseColor,
    elevation,
    materialRef,
    seaLevel,
  ]);
}
