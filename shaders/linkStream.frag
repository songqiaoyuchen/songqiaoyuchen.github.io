uniform sampler2D uAtlas;
uniform vec3 uDecorationColor;
uniform vec3 uLinkColor;
uniform vec3 uHotColor;
uniform float uTime;

varying vec2 vAtlasUv;
varying vec2 vLocalUv;
varying float vNavGlyph;
varying float vIntensity;
varying float vSeed;
varying float vStreamT;
varying float vHover;
varying float vGlitch;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  float field = texture2D(uAtlas, vAtlasUv).r;
  float width = fwidth(field);
  float smoothing = max(width * 1.2, 0.004);
  // Dilate the SDF threshold as glyphs shrink on screen: keeps distant
  // stroke cores at full coverage so streams don't fade toward their ends.
  float threshold = 0.5 - min(width * 1.6, 0.3);
  float glyph = smoothstep(threshold - smoothing, threshold + smoothing, field);
  if (glyph < 0.01) discard;

  float scan = 0.8 + 0.2 * sin(gl_FragCoord.y * 1.45 + uTime * 2.2 + vSeed);
  float roleStrength = mix(0.32, 1.0, vNavGlyph);
  float alpha = glyph * vIntensity * scan * roleStrength;
  vec3 color = mix(uDecorationColor, uLinkColor, vNavGlyph);
  color = mix(color, uHotColor, vHover * (0.25 + vNavGlyph * 0.42) + vGlitch * 0.16);

  if (vGlitch > 0.025) {
    float band = floor(vLocalUv.y * 7.0);
    float split = step(0.58, hash12(vec2(band + vSeed, floor(uTime * 20.0))));
    color += uHotColor * split * vGlitch * 0.22;
  }

  gl_FragColor = vec4(color, alpha);
}
