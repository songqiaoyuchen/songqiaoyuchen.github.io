// Travel trail colour: recorded tracks in the signal colour, bright along the tube's crown and falling away at
// its sides so it reads as a lit line; the gaps between recordings dotted; hidden where the morphing terrain is
// nearer (terrain depth).
uniform vec3 uColor;
uniform float uVisibility;
uniform float uDashed;
uniform float uLength;
uniform float uDashLength;
uniform sampler2D uTerrainDepth;
uniform float uUseTerrainDepth;

varying float vAlong;
varying float vFacing;
varying vec2 vScreenUv;

void main() {
  if (uUseTerrainDepth > 0.5) {
    float terrainDepth = texture2D(uTerrainDepth, vScreenUv).r;
    if (gl_FragCoord.z > terrainDepth) discard;
  }
  float dim = 1.0;
  if (uDashed > 0.5) {
    // Short soft dashes, a little quieter than the recorded track.
    float dash = fract(vAlong * uLength / uDashLength);
    float edgeSoft = smoothstep(0.0, 0.1, dash) * smoothstep(0.5, 0.4, dash);
    if (edgeSoft < 0.004) discard;
    dim = 0.7 * edgeSoft;
  }
  // Bright along the crown, fading to nothing at the sides, so even up close it reads as a soft round line.
  float crown = pow(vFacing, 1.4);
  vec3 color = uColor * (0.3 + 0.9 * crown);
  gl_FragColor = vec4(color * dim, crown * dim * uVisibility);
}
