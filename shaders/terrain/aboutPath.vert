// About path tube: passes the share of the route travelled and the screen position for depth occlusion.
#include <fog_pars_vertex>

uniform float uDepthBias;

varying float vAlong;
varying vec2 vScreenUv;

void main() {
  // TubeGeometry lays uv.x along the route by arc length.
  vAlong = uv.x;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_Position.z -= uDepthBias * gl_Position.w;
  vScreenUv = gl_Position.xy / gl_Position.w * 0.5 + 0.5;

  #include <fog_vertex>
}
