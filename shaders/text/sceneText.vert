// Scene text glyphs (scene links and hero name): billboards each glyph on the terrain, applies layout offsets,
// hover jiggle and focus brackets. sceneTextMaterial.ts fills in LINK_STREAM_COUNT (the number of words).
attribute vec2 aBillboardOffset;
attribute vec2 aAlternateUv;
attribute vec2 aLocalUv;
attribute float aStreamIndex;
attribute float aNavGlyph;
attribute float aIntensity;
attribute float aSeed;
attribute float aStreamT;
attribute float aSpacingOffset;
attribute float aBorder;

#define LINK_STREAM_COUNT __LINK_STREAM_COUNT__

uniform sampler2D heightmap;
uniform float elevation;
uniform float contrast;
uniform float seaLevel;
uniform float planeSize;
uniform float meshY;
uniform float uLift;
uniform float uTime;
uniform float uHover[LINK_STREAM_COUNT];
uniform float uGlitch[LINK_STREAM_COUNT];
uniform float uTextTarget[LINK_STREAM_COUNT];
uniform float uLayoutOffsetX[LINK_STREAM_COUNT];
uniform float uLayoutOffsetZ[LINK_STREAM_COUNT];
uniform float uVerticalOffset[LINK_STREAM_COUNT];
uniform float uActiveStream;
uniform float uFocused;
uniform float uFocusedSpacingMultiplier;
uniform float uBillboardTilt;
uniform float uJiggleStrength;

varying vec2 vAtlasUv;
varying vec2 vAlternateAtlasUv;
varying vec2 vLocalUv;
varying float vNavGlyph;
varying float vIntensity;
varying float vSeed;
varying float vStreamT;
varying float vHover;
varying float vGlitch;
varying float vTextTarget;
varying float vActive;
varying float vFocused;
varying float vBorder;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float streamValue(float values[LINK_STREAM_COUNT], float indexValue) {
#if LINK_STREAM_COUNT == 1
  return values[0];
#else
  float value = 0.0;
  for (int index = 0; index < LINK_STREAM_COUNT; index++) {
    value += values[index] * (1.0 - step(0.25, abs(indexValue - float(index))));
  }
  return value;
#endif
}

float processH(float raw) {
  float h = pow(max(raw, 0.0), contrast);
  return clamp((h - seaLevel) / max(1.0 - seaLevel, 0.0001), 0.0, 1.0);
}

void main() {
  vAtlasUv = uv;
  vAlternateAtlasUv = aAlternateUv;
  vLocalUv = aLocalUv;
  vNavGlyph = aNavGlyph;
  vIntensity = aIntensity;
  vSeed = aSeed;
  vStreamT = aStreamT;
  vHover = streamValue(uHover, aStreamIndex);
  vGlitch = streamValue(uGlitch, aStreamIndex);
  vTextTarget = streamValue(uTextTarget, aStreamIndex);
  vActive = 1.0 - step(0.25, abs(aStreamIndex - uActiveStream));
  vFocused = uFocused;
  vBorder = aBorder;

  vec2 layoutOffset = vec2(
    streamValue(uLayoutOffsetX, aStreamIndex),
    streamValue(uLayoutOffsetZ, aStreamIndex)
  );
  vec2 layoutPosition = position.xz + layoutOffset;
  vec2 terrainUv = vec2(layoutPosition.x / planeSize + 0.5, 0.5 - layoutPosition.y / planeSize);
  float terrainHeight = processH(texture2D(heightmap, terrainUv).r) * elevation + meshY;
  float verticalOffset = streamValue(uVerticalOffset, aStreamIndex);
  vec3 center = vec3(
    layoutPosition.x,
    terrainHeight + position.y + uLift + verticalOffset,
    layoutPosition.y
  );
  vec3 toCamera = normalize(cameraPosition - center);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCamera));
  float band = floor(aLocalUv.y * 7.0);
  float slice = hash12(vec2(band + aSeed * 31.0, floor(uTime * 18.0)));
  float glitchOffset =
    (slice - 0.5)
    * step(0.5, slice)
    * vGlitch
    * uJiggleStrength
    * 0.42
    * (1.0 - vBorder);

  vec2 billboardOffset = vec2(
    aBillboardOffset.x + glitchOffset,
    aBillboardOffset.y
      + aSpacingOffset * (uFocusedSpacingMultiplier - 1.0) * vFocused
  );
  float tiltCos = cos(uBillboardTilt);
  float tiltSin = sin(uBillboardTilt);
  billboardOffset = vec2(
    billboardOffset.x * tiltCos - billboardOffset.y * tiltSin,
    billboardOffset.x * tiltSin + billboardOffset.y * tiltCos
  );

  vec3 worldPosition = center;
  worldPosition += right * billboardOffset.x;
  worldPosition.y += billboardOffset.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPosition, 1.0);
}
