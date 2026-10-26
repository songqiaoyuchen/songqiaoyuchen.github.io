// The lake surface over the terrain: a flat disc at the water level; each vertex carries how far below the water
// the ground lies (shore), and the screen position for the terrain depth test.
attribute float shore;
attribute float rim; // 0 at the lake's centre, 1 at the edge of the disc

uniform float uDepthBias;

varying vec2 vScreenUv;
varying vec2 vLocal;
varying float vShore;
varying float vRim;

void main() {
  vLocal = position.xy;
  vShore = shore;
  vRim = rim;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_Position.z -= uDepthBias * gl_Position.w;
  vScreenUv = gl_Position.xy / gl_Position.w * 0.5 + 0.5;
}
