// Places globe line layers (graticule, coastlines and lakes): line segments on the sphere, moved by
// the open location's zoom (placesLens.glsl) at their own height off the surface. Over a zoomed location's own ground
// (uGroundFade, the coastlines only) the lines give way to it: the ground draws the true coast.
#include <places_lens>

uniform float uGroundFade;
uniform vec3 uGroundEast;
uniform vec3 uGroundNorth;
uniform vec3 uGroundAnchor;
uniform float uGroundHalfAngle;

varying float vFade;

void main() {
  float lift = length(position);
  vec3 place = position / lift;
  vFade = 1.0;
  if (uGroundFade > 0.0) {
    vec2 offset = vec2(dot(place, uGroundEast), dot(place, uGroundNorth)) / uGroundHalfAngle;
    vFade = 1.0 - uGroundFade * step(0.0, dot(place, uGroundAnchor)) * (1.0 - smoothstep(0.45, 0.95, length(offset)));
  }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(lensWarp(place) * lift, 1.0);
}
