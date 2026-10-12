// About path tube: passes the share of the route travelled and the screen position for depth occlusion.
// On the way to Travel (uMorph) the route rides onto the globe with the terrain (the same wrap as terrain.vert
// and contours.vert, about the same pivot), its tube turning with the surface and shrinking with the landscape.
#include <fog_pars_vertex>

uniform float uDepthBias;
uniform float uRadius; // the tube's radius, world units
uniform float uMorph;
uniform vec3 uGlobeCenter;
uniform float uGlobeRadius;
uniform vec3 uPatchAnchor;
uniform vec3 uPatchEast;
uniform vec3 uPatchNorth;
uniform vec2 uPatchPivot; // world (x, z) of the terrain point that lands on the anchor
uniform float uPatchScale; // world units of arc on the planet per landscape unit, this frame
uniform float uPatchRelief; // height factor on the planet, this frame
uniform float uSeaUnits; // the landing place's elevation, landscape units
uniform float uDatumY; // the terrain surface's world y at the pivot

varying float vAlong;
varying vec2 vScreenUv;

void main() {
  // TubeGeometry lays uv.x along the route by arc length.
  vAlong = uv.x;
  vec3 pos = position;
  if (uMorph > 0.0) {
    // TubeGeometry's normal points out from the route's centre line.
    vec3 center = position - normal * uRadius;
    // Plan offsets from the pivot follow the planet's tangent frame (world +x onto -east, +z onto north).
    vec2 local = vec2(center.x - uPatchPivot.x, uPatchPivot.y - center.z);
    vec3 tangent = uPatchAnchor * uGlobeRadius - (uPatchEast * local.x + uPatchNorth * local.y) * uPatchScale;
    vec3 direction = normalize(tangent);
    // Above sea level by the route's own height plus the landing place's elevation (as terrain.vert).
    float standOff = uGlobeRadius + (center.y - uDatumY) * uPatchRelief + uSeaUnits * uPatchScale;
    vec3 onGlobe = uGlobeCenter + direction * standOff;
    float ride = smoothstep(0.0, 0.05, uMorph);
    // The tube's cross-section turns with the surface and shrinks with the landscape.
    vec3 turned = -uPatchEast * normal.x + uPatchNorth * normal.z + direction * normal.y;
    vec3 tubeNormal = normalize(mix(normal, turned, ride));
    pos = mix(center, onGlobe, ride) + tubeNormal * uRadius * mix(1.0, uPatchScale, ride);
  }
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_Position.z -= uDepthBias * gl_Position.w;
  vScreenUv = gl_Position.xy / gl_Position.w * 0.5 + 0.5;

  #include <fog_vertex>
}
