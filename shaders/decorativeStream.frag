uniform sampler2D uAtlas;
uniform vec3 uColor;
uniform vec3 uHotColor;
uniform float uAtlasColumns;
uniform float uEnergy;

varying vec2 vStreamUv;
varying vec4 vRandom;
varying float vCharCount;
varying float vDensity;
varying float vViewDepth;
varying float vScreenY;
varying float vSoft;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float atlasSample(float character, vec2 glyphUv) {
  vec2 safeUv = clamp(glyphUv, vec2(0.02), vec2(0.98));
  return texture2D(uAtlas, vec2((character + safeUv.x) / uAtlasColumns, safeUv.y)).r;
}

void main() {
  float cellPosition = vStreamUv.y * vCharCount;
  float cellIndex = floor(cellPosition);
  float character = floor(hash12(vec2(cellIndex + vRandom.x * 97.0, vRandom.w * 53.0)) * uAtlasColumns);
  vec2 glyphUv = vec2(vStreamUv.x, fract(cellPosition));

  float shade = atlasSample(character, glyphUv);

  // Cheap depth-of-field stand-in for the removed blur compositor: with
  // distance, glyph detail dissolves into a soft dash filling the (widened)
  // quad, then brightness renormalizes the extra area away.
  float cellFraction = fract(cellPosition);
  float dash = (smoothstep(0.0, 0.42, vStreamUv.x) * (1.0 - smoothstep(0.58, 1.0, vStreamUv.x)))
    * (smoothstep(0.0, 0.34, cellFraction) * (1.0 - smoothstep(0.66, 1.0, cellFraction)));
  shade = mix(shade, dash * 0.62, vSoft * 0.85);

  float endpointFade = smoothstep(0.0, 0.14, vStreamUv.y)
    * (1.0 - smoothstep(0.84, 1.0, vStreamUv.y));
  float topSafeFade = 1.0 - smoothstep(0.78, 0.94, vScreenY);
  float depthFade = mix(0.5, 1.0, 1.0 - smoothstep(8.0, 18.0, vViewDepth));
  float randomA = hash12(vec2(cellIndex + vRandom.y * 71.0, vRandom.z * 113.0));
  float randomB = hash12(vec2(cellIndex * 1.73, vRandom.w * 149.0));
  float hotness = pow(randomA * randomB, 1.35);
  float characterBrightness = mix(0.08, 1.15, hotness);
  float brightness = shade * endpointFade * topSafeFade * depthFade
    * vDensity * characterBrightness * uEnergy / (1.0 + vSoft * 0.9);
  vec3 color = mix(uColor, uHotColor, hotness * 0.7);

  if (brightness < 0.004) discard;
  gl_FragColor = vec4(color * brightness, brightness);
}
