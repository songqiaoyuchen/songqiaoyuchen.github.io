// Travel light points: the globe's night lights (unit directions on the sphere, standing on the relief) and the
// stars behind it (the same shader, a far radius and no relief). Each point carries its height on the map and its
// brightness; the size is screen pixels (uSize at full brightness), so the lights stay points at every planet size
// on the way in. The screen position goes to the fragment shader for terrain-depth occlusion.
attribute float aHeight;
attribute float aIntensity;
attribute float aSeed;

uniform float uRadius;
uniform float uRelief; // share of the radius at the map's top, this frame
uniform float uLift; // share of the radius above the surface
uniform float uSize; // CSS pixels at full brightness
uniform float uScale; // device pixels per CSS pixel
uniform float uTime;
uniform float uTwinkle;

varying float vIntensity;
varying float vSeed;
varying vec2 vScreenUv;

void main() {
  vec3 outward = normalize(position);
  vec3 placed = outward * uRadius * (1.0 + aHeight * uRelief + uLift);
  vec4 mvPosition = modelViewMatrix * vec4(placed, 1.0);
  float flicker = 1.0 - uTwinkle * 0.5 * (0.5 + 0.5 * sin(uTime * (1.5 + aSeed * 2.0) + aSeed * 40.0));
  vIntensity = aIntensity * flicker;
  vSeed = aSeed;
  gl_PointSize = (0.35 + 0.65 * aIntensity) * uSize * uScale;
  gl_Position = projectionMatrix * mvPosition;
  vScreenUv = gl_Position.xy / gl_Position.w * 0.5 + 0.5;
}
