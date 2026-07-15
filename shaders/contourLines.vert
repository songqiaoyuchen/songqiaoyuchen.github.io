#include <fog_pars_vertex>

attribute float t;
attribute float totalLength;
attribute float lineId;
attribute float levelId;

uniform float uElevation;
uniform float uLift;
uniform float uMeshY;
uniform float uMajorEvery;
uniform float uMinorRadius;
uniform float uMajorRadius;
uniform float uDepthBias;
uniform float uLevels;

varying float vT;
varying float vTotalLength;
varying float vLineId;
varying float vMajor;
varying float vLevelRank;
varying vec3 vWorldPos;

void main() {
  vT = t;
  vTotalLength = totalLength;
  vLineId = lineId;
  vLevelRank = levelId / max(uLevels - 1.0, 1.0);
  vMajor = 1.0 - step(0.5, mod(levelId, uMajorEvery));

  // position holds the tube center with y = normalized height; scale it to
  // world elevation here so terrain controls stay live without a rebuild,
  // then inflate along the radial normal (the Lusion tube trick).
  vec3 center = vec3(position.x, position.y * uElevation + uLift + uMeshY, position.z);
  float radius = mix(uMinorRadius, uMajorRadius, vMajor);
  vec3 pos = center + normal * radius;
  vWorldPos = pos;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Convert a constant normalized-device-depth offset back to clip space.
  // Never divide by w here: vertices crossing the eye plane have w near zero.
  gl_Position.z -= uDepthBias * gl_Position.w;

  #include <fog_vertex>
}
