uniform sampler2D uAtlas;
uniform vec3 uDecorationColor;
uniform vec3 uStreamColor;
uniform vec3 uHotColor;
uniform float uTime;
uniform float uDissolve;

varying vec2 vAtlasUv;
varying vec2 vAlternateAtlasUv;
varying vec2 vLocalUv;
varying float vNavGlyph;
varying float vIntensity;
varying float vSeed;
varying float vStreamT;
varying float vHover;
varying float vGlitch;
varying float vTextTarget;
varying float vActive;
varying float vFocused;
varying float vBorder;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 atlasUvForGlyph(float glyphIndex, vec2 localUv) {
  float column = mod(glyphIndex, 16.0);
  float row = floor(glyphIndex / 16.0);
  return vec2(
    (column + localUv.x) / 16.0,
    1.0 - (row + 1.0 - localUv.y) / 8.0
  );
}

void main() {
  vec2 dissolveCell = floor(gl_FragCoord.xy / 7.0);
  float dissolveNoise = hash12(dissolveCell + vec2(vSeed * 9.7, floor(vStreamT * 17.0)));
  if (uDissolve <= 0.0 || dissolveNoise > uDissolve) discard;

  float scan = 0.8 + 0.2 * sin(gl_FragCoord.y * 1.45 + uTime * 2.2 + vSeed);
  if (vBorder > 0.5) {
    if (vActive * vFocused < 0.5) discard;
    vec3 borderColor = mix(uStreamColor, uHotColor, 0.46);
    gl_FragColor = vec4(borderColor, vIntensity * scan * 0.92);
    return;
  }

  vec2 settledAtlasUv = mix(vAtlasUv, vAlternateAtlasUv, vTextTarget);
  float scrambleStrength = smoothstep(0.08, 0.96, vGlitch);
  float settleOrder = hash12(vec2(vSeed * 4.31, 7.17));
  float scrambleMask = step(settleOrder, scrambleStrength);
  float randomGlyph = 1.0 + floor(
    hash12(vec2(vSeed * 19.7, floor(uTime * 18.0))) * 58.0
  );
  vec2 scrambledAtlasUv = atlasUvForGlyph(randomGlyph, vLocalUv);
  float field = texture2D(
    uAtlas,
    mix(settledAtlasUv, scrambledAtlasUv, scrambleMask)
  ).r;
  float width = fwidth(field);
  float smoothing = max(width * 1.2, 0.004);
  // Dilate the SDF threshold as glyphs shrink on screen: keeps distant
  // stroke cores at full coverage so streams don't fade toward their ends.
  float threshold = 0.5 - min(width * 1.6, 0.3) - vActive * vFocused * vNavGlyph * 0.025;
  float glyph = smoothstep(threshold - smoothing, threshold + smoothing, field);
  if (glyph < 0.01) discard;

  float roleStrength = mix(0.32, 1.0, vNavGlyph);
  float focusEmphasis = mix(1.0, mix(0.52, 1.08, vActive), vFocused);
  focusEmphasis = mix(focusEmphasis, max(focusEmphasis, 0.94), vHover);
  float alpha = glyph * vIntensity * scan * roleStrength * focusEmphasis;
  vec3 color = mix(uDecorationColor, uStreamColor, vNavGlyph);
  color = mix(
    color,
    uHotColor,
    vHover * (0.25 + vNavGlyph * 0.42) + vGlitch * 0.16 + vActive * vFocused * 0.28
  );

  if (vGlitch > 0.025) {
    float band = floor(vLocalUv.y * 7.0);
    float split = step(0.58, hash12(vec2(band + vSeed, floor(uTime * 20.0))));
    color += uHotColor * split * vGlitch * 0.22;
  }

  gl_FragColor = vec4(color, alpha);
}
