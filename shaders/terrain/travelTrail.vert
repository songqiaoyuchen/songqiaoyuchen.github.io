// Travel trail tube: rides the globe's relief (the same elevation map, summary blend and lift as the shell) and
// passes the share of the track travelled, for the dotted connectors, how squarely the tube's surface faces the
// camera (so it reads as a lit line, bright along its crown), and the screen position for terrain-depth occlusion.
uniform sampler2D uElevation;
uniform float uHasElevation;
uniform float uRelief;
uniform float uRadius;
uniform sampler2D uSummary;
uniform float uFocus;

varying float vAlong;
varying float vFacing;
varying vec2 vScreenUv;

const float PI = 3.14159265358979;

void main() {
  // TubeGeometry lays uv.x along the track by arc length.
  vAlong = uv.x;
  vec3 outward = normalize(position);
  vec3 displaced = position;
  if (uHasElevation > 0.5) {
    // Equirectangular map: longitude 0 faces +Z, east is +X.
    vec2 mapUv = vec2(0.5 + atan(outward.x, outward.z) / (2.0 * PI), 0.5 + asin(clamp(outward.y, -1.0, 1.0)) / PI);
    float height = mix(texture2D(uElevation, mapUv).r, texture2D(uSummary, mapUv).r, uFocus);
    displaced += outward * (height * uRelief * uRadius);
  }
  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  vFacing = max(dot(normalize(normalMatrix * normal), normalize(-mvPosition.xyz)), 0.0);
  gl_Position = projectionMatrix * mvPosition;
  vScreenUv = gl_Position.xy / gl_Position.w * 0.5 + 0.5;
}
