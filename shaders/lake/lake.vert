// The lake surface over the terrain: a flat disc at the water level, carrying its world plan position (the
// shore is read from the contour field there), the plan distance for the terrain's edge fade and the screen
// position for the terrain depth test.
#include <fog_pars_vertex>
attribute float rim; // 0 at the lake's centre, 1 at the edge of the disc

varying vec2 vScreenUv;
varying vec2 vWorld; // world x, z
varying float vPlan; // plan distance from the terrain plane's centre, for the terrain's edge fade
varying vec2 vLocal;
varying float vRim;

void main() {
  vLocal = position.xy;
  vRim = rim;
  vWorld = (modelMatrix * vec4(position, 1.0)).xz;
  vPlan = length(vWorld);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vScreenUv = gl_Position.xy / gl_Position.w * 0.5 + 0.5;
  #include <fog_vertex>
}
