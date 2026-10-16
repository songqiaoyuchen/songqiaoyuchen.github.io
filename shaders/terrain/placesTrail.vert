// Places trail tube: rides the globe's relief (the same elevation map, summary blend and lift as the shell). The
// whole cross-section rises by the height under the track's centre line (aCenter), so the tube keeps its round
// section and its normals; sampling per vertex would shear it texel by texel and flicker its shading. With a location
// open (uFocus) the section narrows to the location's thickness (uLocationWidth, a share of the overview's). The relief
// shapes the trail but never hides it: it draws over the shell and is hidden only where the globe's body (a sphere
// of uRadius) stands between its centre line and the eye (uEye, globe space), as behindGlobe in lib/scene/places.ts.
// Passes that and how squarely the tube's surface faces the camera (so it reads as a lit line, bright along its
// crown). The open location's lens moves the centre line with the ground (placesLens.glsl), the section unchanged.
#include <places_lens>

uniform sampler2D uElevation;
uniform float uHasElevation;
uniform float uRelief;
uniform float uRadius;
uniform sampler2D uSummary;
uniform float uFocus;
uniform float uLocationWidth;
uniform vec3 uEye;

attribute vec3 aCenter;

varying float vFacing;
varying float vBehind;

const float PI = 3.14159265358979;

void main() {
  vec3 outward = normalize(aCenter);
  vec3 drawn = lensWarp(outward);
  vec3 lift = vec3(0.0);
  if (uHasElevation > 0.5) {
    // Equirectangular map: longitude 0 faces +Z, east is +X.
    vec2 mapUv = vec2(0.5 + atan(outward.x, outward.z) / (2.0 * PI), 0.5 + asin(clamp(outward.y, -1.0, 1.0)) / PI);
    float height = mix(texture2D(uElevation, mapUv).r, texture2D(uSummary, mapUv).r, uFocus);
    lift = drawn * (height * uRelief * uRadius * lensRelief(drawn));
  }
  vec3 center = drawn * length(aCenter) + lift;
  vec3 toEye = uEye - center;
  float a = dot(toEye, toEye);
  float b = 2.0 * dot(center, toEye);
  float disc = b * b - 4.0 * a * (dot(center, center) - uRadius * uRadius);
  float enter = (-b - sqrt(max(disc, 0.0))) / (2.0 * a);
  vBehind = disc > 0.0 && enter > 0.0 && enter < 1.0 ? 1.0 : 0.0;
  vec3 section = (position - aCenter) * mix(1.0, uLocationWidth, uFocus);
  vec4 mvPosition = modelViewMatrix * vec4(center + section, 1.0);
  vFacing = max(dot(normalize(normalMatrix * normal), normalize(-mvPosition.xyz)), 0.0);
  gl_Position = projectionMatrix * mvPosition;
}
