uniform sampler2D uAtlas;
uniform vec3 uColor;
uniform vec3 uHotColor;
uniform float uAtlasColumns;
uniform float uEnergy;
uniform float uAnimationTime;
uniform vec2 uFallRowsPerSecond;
uniform vec2 uPacketRowsPerSecond;
uniform vec2 uLetterSwapsPerSecond;

varying vec2 vStreamUv;
varying vec4 vRandom;
varying float vCharCount;
varying float vDensity;
varying float vViewDepth;
varying float vScreenY;

vec4 hash43(vec3 p) {
  vec4 p4 = fract(vec4(p.xyzx) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
  p4 += dot(p4, p4.wzxy + 33.33);
  return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

float atlasSample(float character, vec2 glyphUv) {
  vec2 safeUv = clamp(glyphUv, vec2(0.02), vec2(0.98));
  return texture2D(uAtlas, vec2((character + safeUv.x) / uAtlasColumns, safeUv.y)).r;
}

void main() {
  float fallSpeed = mix(uFallRowsPerSecond.x, uFallRowsPerSecond.y, vRandom.y);
  float cellPosition = vStreamUv.y * vCharCount - uAnimationTime * fallSpeed;
  float cellIndex = floor(mod(cellPosition, uAtlasColumns));
  float swapRandom = 0.5 * (
    vRandom.y + hash43(vec3(cellIndex, -100.0, vRandom.z)).x
  );
  float characterTime = uAnimationTime * mix(
    uLetterSwapsPerSecond.x,
    uLetterSwapsPerSecond.y,
    swapRandom
  );
  vec4 characterRandom = hash43(vec3(
    cellIndex,
    vRandom.w,
    floor(characterTime * -1.0)
  ));
  float character = mod(
    cellIndex + floor(characterRandom.x * uAtlasColumns),
    uAtlasColumns
  );
  vec2 glyphUv = vec2(vStreamUv.x, mod(cellPosition, 1.0));

  float shade = atlasSample(character, glyphUv);

  float endpointFade = smoothstep(0.5, 0.35, abs(vStreamUv.y - 0.5));
  float topSafeFade = 1.0 - smoothstep(0.78, 0.94, vScreenY);
  float depthFade = mix(0.5, 1.0, 1.0 - smoothstep(8.0, 18.0, vViewDepth));
  float streamRow = vStreamUv.y * vCharCount;
  float packetCycle = vCharCount + 4.0;
  float packetCenter = mod(
    uAnimationTime * mix(uPacketRowsPerSecond.x, uPacketRowsPerSecond.y, vRandom.x)
      + vRandom.y * packetCycle,
    packetCycle
  ) - 2.0;
  float packetHalfWidth = mix(1.0, 2.0, vRandom.z);
  float packet = 1.0 - smoothstep(
    packetHalfWidth,
    packetHalfWidth + 1.0,
    abs(streamRow - packetCenter)
  );
  float packetBrightness = mix(0.55, 1.5, packet);
  float hotness = pow(characterRandom.y * characterRandom.w, 1.35);
  float characterBrightness = characterRandom.y * characterRandom.w;
  float brightness = shade * endpointFade * topSafeFade * depthFade
    * vDensity * (0.3 + vRandom.z * 1.25)
    * characterBrightness * packetBrightness * uEnergy;
  vec3 color = mix(uColor, uHotColor, hotness * 0.7);

  if (brightness < 0.004) discard;
  gl_FragColor = vec4(color * brightness, brightness * 3.0);
}
