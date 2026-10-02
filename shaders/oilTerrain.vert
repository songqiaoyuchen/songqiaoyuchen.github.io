#include <fog_pars_vertex>
uniform sampler2D heightmap;
uniform float elevation;
uniform float contrast;
uniform float seaLevel;
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  float h = pow(max(texture2D(heightmap, uv).r, 0.0), contrast);
  h = clamp((h - seaLevel) / max(1.0 - seaLevel, 0.0001), 0.0, 1.0);
  vec3 pos = position;
  pos.z += h * elevation;
  vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
