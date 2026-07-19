attribute vec2 aAnchor;
attribute vec4 aParams;
attribute vec4 aRandom;

uniform sampler2D heightmap;
uniform float elevation;
uniform float contrast;
uniform float seaLevel;
uniform float planeSize;
uniform float meshY;
uniform float uLift;

varying vec2 vStreamUv;
varying vec4 vRandom;
varying float vCharCount;
varying float vDensity;
varying float vViewDepth;
varying float vScreenY;
varying float vSoft;

float processH(float raw) {
  float h = pow(max(raw, 0.0), contrast);
  return clamp((h - seaLevel) / max(1.0 - seaLevel, 0.0001), 0.0, 1.0);
}

void main() {
  float charCount = aParams.x;
  float glyphHeight = aParams.y;
  float streamHeight = charCount * glyphHeight;
  float glyphWidth = glyphHeight * 0.75;
  vec2 terrainUv = vec2(aAnchor.x / planeSize + 0.5, 0.5 - aAnchor.y / planeSize);
  float terrainHeight = processH(texture2D(heightmap, terrainUv).r) * elevation + meshY;
  vec3 center = vec3(aAnchor.x, terrainHeight + aParams.z + uLift, aAnchor.y);
  vec3 toCamera = normalize(cameraPosition - center);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCamera));

  // Cheap depth-of-field stand-in for the removed blur compositor: distant
  // streams get a wider quad (the fragment shader melts their glyphs into
  // soft dashes and renormalizes the added area).
  float soft = smoothstep(8.0, 13.0, distance(cameraPosition, center));
  glyphWidth *= 1.0 + soft * 0.9;

  vec3 worldPosition = center;
  worldPosition += right * ((uv.x - 0.5) * glyphWidth);
  worldPosition.y += uv.y * streamHeight;

  vec4 mvPosition = modelViewMatrix * vec4(worldPosition, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vStreamUv = uv;
  vRandom = aRandom;
  vCharCount = charCount;
  vDensity = aParams.w;
  vViewDepth = -mvPosition.z;
  vScreenY = gl_Position.y / gl_Position.w;
  vSoft = soft;
}
