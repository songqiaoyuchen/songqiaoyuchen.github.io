#include <fog_pars_vertex>

uniform sampler2D uHeightmap;
uniform float elevation;
uniform float contrast;
uniform float seaLevel;
uniform float uShellLift;

varying float vHeight;
varying vec2  vUv;

// Same height processing as the base terrain so the shell tracks its landform,
// but sampled from the Laplacian-smoothed grid and lifted off the surface.
void main() {
  vUv = uv;

  float raw = texture2D(uHeightmap, uv).r;
  float h = pow(max(raw, 0.0), contrast);
  h = clamp((h - seaLevel) / max(1.0 - seaLevel, 0.0001), 0.0, 1.0);
  vHeight = h;

  vec3 pos = position;
  pos.z += h * elevation + uShellLift;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  #include <fog_vertex>
}
