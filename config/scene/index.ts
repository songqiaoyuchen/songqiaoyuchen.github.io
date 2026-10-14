// Barrel for the WebGL scene configs; prefer importing a single file when only one is needed.
export {CAMERA_CONFIG, getCameraPose, getTravelIndexPose, getTravelTripPose, type CameraPose} from './camera';
export {CONTOUR_CONFIG} from './contours';
export {GLYPH_RAIN_CONFIG} from './glyphRain';
export {FOG_CONFIG} from './fog';
export {INTRO_CONFIG} from './intro';
export {SCENE_LAYOUT_CONFIG} from './layout';
export {POST_PROCESSING_CONFIG} from './postProcessing';
export {
  MOBILE_SCENE_LINK_CONFIG,
  SCENE_LINK_EFFECT_CONFIG,
  SCENE_LINK_LAYOUT,
  SCENE_LINKS,
  type MobileSceneLinkSettings,
  type SceneLink,
} from './sceneLinks';
export {TERRAIN_MATERIAL_CONFIG, TERRAIN_MESH_CONFIG} from './terrain';
