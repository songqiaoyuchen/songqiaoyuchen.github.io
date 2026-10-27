// The lake surface over the terrain: a flat disc at the water level, carrying its world plan position (the
// shore is read from the contour field there), the plan distance for the terrain's edge fade and the screen
// position for the terrain depth test.
#include <fog_pars_vertex>
attribute float rim; // 0 at the lake's centre, 1 at the edge of the disc
uniform float uDepthBias; // the contour lines' own pull toward the camera, in normalized device depth

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
  // Pulled toward the camera as the contour lines are, so a steep bank's lip hides the water at its foot no
  // more than it hides the shore line there: the water fills to the line.
  gl_Position.z -= uDepthBias * gl_Position.w;
  vScreenUv = gl_Position.xy / gl_Position.w * 0.5 + 0.5;
  #include <fog_vertex>
}
