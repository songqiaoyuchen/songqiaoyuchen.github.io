#include <fog_pars_vertex>

uniform sampler2D heightmap;
uniform float elevation;
uniform float contrast;
uniform float seaLevel;

void main() {
  float h = texture2D(heightmap, uv).r;
  h = pow(h, contrast);
  h = clamp((h - seaLevel) / max(1.0 - seaLevel, 0.0001), 0.0, 1.0);
  vec3 pos = position;
  pos.z += h * elevation;
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
