// Adds the composited glyph rain texture, revealed through a 7px pixel dissolve driven by uVisibility.
uniform sampler2D uTexture;
uniform float uVisibility;
varying vec2 vUv;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  float noise = hash12(floor(gl_FragCoord.xy / 7.0));
  if (uVisibility <= 0.0 || noise > uVisibility) discard;
  gl_FragColor = texture2D(uTexture, vUv);
}
