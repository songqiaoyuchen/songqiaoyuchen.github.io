attribute vec2 aBillboardOffset;
attribute vec2 aLocalUv;
attribute float aLinkId;
attribute float aNavGlyph;
attribute float aIntensity;
attribute float aSeed;
attribute float aStreamT;

uniform sampler2D heightmap;
uniform float elevation;
uniform float contrast;
uniform float seaLevel;
uniform float planeSize;
uniform float meshY;
uniform float uLift;
uniform float uTime;
uniform vec4 uHover;
uniform vec4 uGlitch;
uniform vec4 uLayoutOffsetX;
uniform vec4 uLayoutOffsetZ;
uniform float uLayoutProgress;
uniform float uActiveLink;
uniform float uFocused;

varying vec2 vAtlasUv;
varying vec2 vLocalUv;
varying float vNavGlyph;
varying float vIntensity;
varying float vSeed;
varying float vStreamT;
varying float vHover;
varying float vGlitch;
varying float vActive;
varying float vFocused;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float linkValue(vec4 values, float id) {
  if (id < 0.5) return values.x;
  if (id < 1.5) return values.y;
  if (id < 2.5) return values.z;
  return values.w;
}

float processH(float raw) {
  float h = pow(max(raw, 0.0), contrast);
  return clamp((h - seaLevel) / max(1.0 - seaLevel, 0.0001), 0.0, 1.0);
}

void main() {
  vAtlasUv = uv;
  vLocalUv = aLocalUv;
  vNavGlyph = aNavGlyph;
  vIntensity = aIntensity;
  vSeed = aSeed;
  vStreamT = aStreamT;
  vHover = linkValue(uHover, aLinkId);
  vGlitch = linkValue(uGlitch, aLinkId);
  vActive = 1.0 - step(0.25, abs(aLinkId - uActiveLink));
  vFocused = uFocused;

  vec2 layoutOffset = vec2(
    linkValue(uLayoutOffsetX, aLinkId),
    linkValue(uLayoutOffsetZ, aLinkId)
  ) * uLayoutProgress;
  vec2 layoutPosition = position.xz + layoutOffset;
  vec2 terrainUv = vec2(layoutPosition.x / planeSize + 0.5, 0.5 - layoutPosition.y / planeSize);
  float terrainHeight = processH(texture2D(heightmap, terrainUv).r) * elevation + meshY;
  vec3 center = vec3(layoutPosition.x, terrainHeight + position.y + uLift, layoutPosition.y);
  vec3 toCamera = normalize(cameraPosition - center);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCamera));
  float band = floor(aLocalUv.y * 7.0);
  float slice = hash12(vec2(band + aSeed * 31.0, floor(uTime * 18.0)));
  float glitchOffset = (slice - 0.5) * step(0.5, slice) * vGlitch * 0.42;

  vec3 worldPosition = center;
  worldPosition += right * (aBillboardOffset.x + glitchOffset);
  worldPosition.y += aBillboardOffset.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPosition, 1.0);
}
