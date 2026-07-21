#include <fog_pars_vertex>

attribute float t;
attribute float totalLength;
attribute float lineId;
attribute float major;
attribute float travelDirection;
attribute float shadow;

uniform float uElevation;
uniform float uLift;
uniform float uMeshY;
uniform float uMinorRadius;
uniform float uMajorRadius;
uniform float uDepthBias;
uniform float uPlaneSize;

varying float vT;
varying float vTotalLength;
varying float vLineId;
varying float vMajor;
varying float vTravelDirection;
varying float vShadow;
varying vec2 vTerrainUv;

void main() {
  vT = t;
  vTotalLength = totalLength;
  vLineId = lineId;
  // Major placement is decided at extraction (every-Nth, min-height gated).
  vMajor = major;
  vTravelDirection = travelDirection;
  vShadow = shadow;

  vec3 center = vec3(
    position.x,
    position.y * uElevation + uLift + uMeshY,
    position.z
  );
  float radius = mix(uMinorRadius, uMajorRadius, vMajor);
  vec3 pos = center + normal * radius;
  vTerrainUv = vec2(
    center.x / uPlaneSize + 0.5,
    0.5 - center.z / uPlaneSize
  );

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_Position.z -= uDepthBias * gl_Position.w;

  #include <fog_vertex>
}
