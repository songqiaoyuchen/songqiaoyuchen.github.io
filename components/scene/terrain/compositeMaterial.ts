// Uniforms, defines and vertex shader of the full-screen terrain compositor (shaders/terrain/terrainComposite.frag).
import {Color, Matrix3, Matrix4, Vector2, Vector3, type DepthTexture, type Texture} from 'three';
import {ART_CURSOR_CONFIG} from '@/config/art/cursor';
import {FOG_CONFIG} from '@/config/scene';

export const compositeVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const {pencil: pencilCursor, dots: dotsCursor} = ART_CURSOR_CONFIG;
// Shader constants must be written as floats.
export const compositeDefines = Object.fromEntries(Object.entries({
  DIGITAL_CELL: dotsCursor.cell,
  DOTS_SHADE: dotsCursor.shade,
  DOTS_SKY: dotsCursor.sky,
  PENCIL_SPACING: pencilCursor.spacing,
  PENCIL_WIDTH: pencilCursor.width,
}).map(([name, value]) => [name, value.toFixed(4)]));

type Reveal = {majorColor: string; majorIntensity: number; majorRadius: number};

/** Placeholder textures point at the terrain cache until a backdrop or cursor field exists. */
export function createCompositeUniforms(texture: Texture, depthTexture: DepthTexture | null, reveal: Reveal) {
  return {
    uTexture: {value: texture},
    uTerrainDepth: {value: depthTexture},
    uClipToWorld: {value: new Matrix4()},
    uClipToView: {value: new Matrix4()},
    uRevealFog: {value: new Vector2()},
    uTerrainHeight: {value: new Vector2()},
    uResolution: {value: new Vector2()},
    // Replaced by the live --color-accent CSS token on mount.
    uDigitalAccent: {value: new Color('#e8c77a')},
    uRevealColor: {value: new Color(reveal.majorColor)},
    uRevealIntensity: {value: reveal.majorIntensity},
    uRevealRadius: {value: reveal.majorRadius},
    uBackground: {value: new Color(FOG_CONFIG.color)},
    uOil: {value: texture},
    uPencil: {value: texture},
    uFrom: {value: 0},
    uTo: {value: 0},
    uProgress: {value: 1},
    uArtOpacity: {value: 0},
    uScreenToImage: {value: new Matrix3()},
    uCaptureSource: {value: -1},
    uCaptureAdjust: {value: new Vector3(0, 1, 1)},
    uCaptureReady: {value: 0},
    uTouch: {value: texture},
    uTouchAmount: {value: 0},
    uSmudge: {value: texture},
    uSmudgeAmount: {value: 0},
    uPixelRatio: {value: 1},
    uStrokeColor: {value: new Color(pencilCursor.strokeColor)},
    uPencilLines: {value: 0},
    uDotsLight: {value: 0},
  };
}
