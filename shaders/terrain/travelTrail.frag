// Travel trail colour: a trip's tracks in the signal colour, bright along the tube's crown and falling away at
// its sides so it reads as a lit line; hidden only behind the globe's body, never by terrain (the relief or the
// landscape riding it).
uniform vec3 uColor;
uniform float uVisibility;

varying float vFacing;
varying float vBehind;

void main() {
  if (vBehind > 0.5) discard;
  // Bright along the crown, fading to nothing at the sides, so even up close it reads as a soft round line.
  float crown = pow(vFacing, 1.4);
  vec3 color = uColor * (0.3 + 0.9 * crown);
  gl_FragColor = vec4(color, crown * uVisibility);
}
