// Places trail colour: a location's tracks in the signal colour, bright along the tube's crown and falling away at
// its sides so it reads as a lit line; hidden only behind the globe's body, never by terrain (the relief or the
// landscape riding it).
uniform vec3 uColor;
uniform float uVisibility;

varying float vFacing;
varying float vBehind;

void main() {
  if (vBehind > 0.5) discard;
  // A sliver of the tube thinner than a pixel can rasterise with non-finite interpolants: dropped here, since one
  // NaN texel in the bloom's input spreads over the whole frame through its blur. The facing is clamped as well:
  // interpolation can carry it a hair below zero, where pow is undefined.
  if (isnan(vFacing) || isinf(vFacing)) discard;
  // Bright along the crown, fading to nothing at the sides, so even up close it reads as a soft round line.
  float crown = pow(clamp(vFacing, 0.0, 1.0), 1.4);
  vec3 color = uColor * (0.3 + 0.9 * crown);
  gl_FragColor = vec4(color, crown * uVisibility);
}
