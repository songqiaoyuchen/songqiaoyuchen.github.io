// Terrain surface: displaces the plane by the baked heightmap (rendered only into the CachedTerrain cache).
#include <fog_pars_vertex>

uniform sampler2D heightmap;
uniform float elevation;
uniform float contrast;
uniform float seaLevel;

varying float vHeight;
varying vec2  vUv;
varying vec3 vWorldPosition;

float processH(float raw) {
  float h = pow(max(raw, 0.0), contrast);
  return clamp((h - seaLevel) / max(1.0 - seaLevel, 0.0001), 0.0, 1.0);
}

void main() {
  vUv = uv;

  float h = processH(texture2D(heightmap, uv).r);
  vHeight = h;

  vec3 pos = position;
  pos.z += h * elevation;
  vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  #include <fog_vertex>
}
