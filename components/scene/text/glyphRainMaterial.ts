// Material setup for the glyph rain columns (shaders/text/glyphRain.*) and its additive composite blend.
import {
  AddEquation,
  Color,
  CustomBlending,
  DoubleSide,
  OneFactor,
  ShaderMaterial,
  Vector2,
  type Texture,
} from 'three';
import {GLYPH_RAIN_CONFIG, TERRAIN_MATERIAL_CONFIG, TERRAIN_MESH_CONFIG} from '@/config/scene';
import {GLYPH_RAIN_ATLAS_COLUMNS} from '@/lib/text/glyphRainGeometry';
import fragmentShader from '@/shaders/text/glyphRain.frag';
import vertexShader from '@/shaders/text/glyphRain.vert';

/** Pure additive blending (colour and alpha), shared by the columns and their composite. */
export const ADDITIVE_BLEND = {
  blending: CustomBlending,
  blendEquation: AddEquation,
  blendSrc: OneFactor,
  blendDst: OneFactor,
  blendEquationAlpha: AddEquation,
  blendSrcAlpha: OneFactor,
  blendDstAlpha: OneFactor,
} as const;

type GlyphRainMaterialOptions = {
  atlas: Texture;
  heightmap: Texture;
  elevation: number;
  seaLevel: number;
  color: string;
  hotColor: string;
};

const range = ([min, max]: readonly [number, number]) => new Vector2(min, max);

export function createGlyphRainMaterial(
  {atlas, heightmap, elevation, seaLevel, color, hotColor}: GlyphRainMaterialOptions,
) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      heightmap: { value: heightmap },
      elevation: { value: elevation },
      contrast: { value: TERRAIN_MATERIAL_CONFIG.contrast },
      seaLevel: { value: seaLevel },
      planeSize: { value: TERRAIN_MESH_CONFIG.planeSize },
      meshY: { value: TERRAIN_MESH_CONFIG.position[1] },
      uLift: { value: GLYPH_RAIN_CONFIG.lift },
      uAtlas: { value: atlas },
      uAtlasColumns: { value: GLYPH_RAIN_ATLAS_COLUMNS },
      uColor: { value: new Color(color) },
      uHotColor: { value: new Color(hotColor) },
      uEnergy: { value: GLYPH_RAIN_CONFIG.energy },
      uAnimationTime: { value: 0 },
      uFallRowsPerSecond: {value: range(GLYPH_RAIN_CONFIG.animation.fallRowsPerSecond)},
      uPacketRowsPerSecond: {value: range(GLYPH_RAIN_CONFIG.animation.packetRowsPerSecond)},
      uLetterSwapsPerSecond: {value: range(GLYPH_RAIN_CONFIG.animation.letterSwapsPerSecond)},
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
    ...ADDITIVE_BLEND,
    toneMapped: false,
  });
}
