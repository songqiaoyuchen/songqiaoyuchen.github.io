// Travel light points: a soft disc in the point colour, the brightest ones whitening toward their core (they carry
// into the bloom pass); the stars take a slight warm-to-cool tint from their seed. Hidden where the morphing
// terrain is nearer (terrain depth).
uniform vec3 uColor;
uniform float uVisibility;
uniform float uIntensity; // brightness gain (Leva light intensity; stars 1)
uniform float uTint; // how far the seed shifts the colour between warm and cool (stars)
uniform sampler2D uTerrainDepth;
uniform float uUseTerrainDepth;

varying float vIntensity;
varying float vSeed;
varying vec2 vScreenUv;

void main() {
  if (uUseTerrainDepth > 0.5) {
    float terrainDepth = texture2D(uTerrainDepth, vScreenUv).r;
    if (gl_FragCoord.z > terrainDepth) discard;
  }
  vec2 offset = gl_PointCoord - 0.5;
  float disc = smoothstep(0.5, 0.1, length(offset));
  if (disc < 0.004) discard;
  vec3 tint = mix(vec3(1.0, 0.92, 0.8), vec3(0.8, 0.9, 1.0), vSeed);
  vec3 color = mix(uColor, tint, uTint);
  color = mix(color, vec3(1.0), 0.35 * vIntensity * vIntensity);
  // Additive: the colour carries the disc and the fade, alpha stays 1 so nothing is applied twice.
  gl_FragColor = vec4(color * disc * vIntensity * uVisibility * uIntensity, 1.0);
}
