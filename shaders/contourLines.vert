#include <fog_pars_vertex>

attribute float t;
attribute float totalLength;
attribute float lineId;
attribute float major;
attribute float travelDirection;
attribute float shadow;

uniform float uElevation;
uniform float uLift;
uniform float uMeshY;
uniform float uMinorRadius;
uniform float uMajorRadius;
uniform float uDepthBias;
uniform float uPlaneSize;
uniform float uTime;
uniform float uPulseSpeed;
uniform float uPulseScale;

varying float vT;
varying float vTotalLength;
varying float vMajor;
varying float vTravelDirection;
varying float vShadow;
varying vec2 vTerrainUv;
varying float vNoise;
varying vec2 vScreenUv;

// Periodic classic Perlin noise (Stefan Gustavson / webgl-noise, MIT).
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 value) {
  return value * value * value * (value * (value * 6.0 - 15.0) + 10.0);
}

float pnoise(vec2 point, vec2 repetition) {
  vec4 pi = floor(point.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 pf = fract(point.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  pi = mod(pi, repetition.xyxy);
  pi = mod289(pi);
  vec4 ix = pi.xzxz;
  vec4 iy = pi.yyww;
  vec4 fx = pf.xzxz;
  vec4 fy = pf.yyww;
  vec4 permutation = permute(permute(ix) + iy);
  vec4 gx = fract(permutation * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx -= tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(
    dot(g00, g00),
    dot(g01, g01),
    dot(g10, g10),
    dot(g11, g11)
  ));
  g00 *= norm.x;
  g01 *= norm.y;
  g10 *= norm.z;
  g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fadeXY = fade(pf.xy);
  vec2 nx = mix(vec2(n00, n01), vec2(n10, n11), fadeXY.x);
  return 2.3 * mix(nx.x, nx.y, fadeXY.y);
}

void main() {
  vT = t;
  vTotalLength = totalLength;
  // Major placement is decided at extraction (every-Nth, min-height gated).
  vMajor = major;
  vTravelDirection = travelDirection;
  vShadow = shadow;
  float safeLength = max(totalLength, 0.0001);
  float noisePosition = mod(t - uTime * uPulseSpeed, safeLength);
  vNoise = pnoise(
    vec2(noisePosition * uPulseScale, lineId * 7.31),
    vec2(safeLength * uPulseScale, 100.0)
  );

  vec3 center = vec3(
    position.x,
    position.y * uElevation + uLift + uMeshY,
    position.z
  );
  float radius = mix(uMinorRadius, uMajorRadius, vMajor);
  vec3 pos = center + normal * radius;
  vTerrainUv = pos.xz / uPlaneSize + 0.5;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_Position.z -= uDepthBias * gl_Position.w;
  vScreenUv = gl_Position.xy / gl_Position.w * 0.5 + 0.5;

  #include <fog_vertex>
}
