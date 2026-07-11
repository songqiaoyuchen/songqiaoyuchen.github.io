#include <fog_pars_vertex>

uniform sampler2D uHeightmap;

uniform float elevation;
uniform float contrast;
uniform float seaLevel;
uniform float uShellLift;

varying float vHeight;
varying vec2 vUv;

float normalizedHeight(vec2 uv) {
  float height = pow(max(texture2D(uHeightmap, uv).r, 0.0), contrast);
  return clamp((height - seaLevel) / max(1.0 - seaLevel, 0.0001), 0.0, 1.0);
}

void main() {
  vUv = uv;

  vHeight = normalizedHeight(uv);

  vec3 pos = position;
  pos.z += vHeight * elevation + uShellLift;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  #include <fog_vertex>
}
