#include <fog_pars_fragment>

uniform float uTime;
uniform float uIntroTime;
uniform float uIntroTravelSpeed;
uniform float uEdgeFadeWidth;

uniform vec3 uMajorColor;
uniform float uMajorIntensity;
uniform vec3 uMinorColor;
uniform float uMinorIntensity;
uniform float uMinorBase;
uniform float uShadowIntensity;

uniform vec3 uPulseColor;
uniform float uPulseTint;
uniform float uPulseSpeed;
uniform float uPulseScale;
uniform float uPulseSharpness;

varying float vT;
varying float vTotalLength;
varying float vLineId;
varying float vMajor;
varying float vTravelDirection;
varying float vShadow;
varying vec2 vTerrainUv;

// Periodic classic Perlin noise (Stefan Gustavson / webgl-noise, MIT).
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

float pnoise(vec2 P, vec2 rep) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod(Pi, rep.xyxy);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x;
  g01 *= norm.y;
  g10 *= norm.z;
  g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fadeXY = fade(Pf.xy);
  vec2 nx = mix(vec2(n00, n01), vec2(n10, n11), fadeXY.x);
  return 2.3 * mix(nx.x, nx.y, fadeXY.y);
}

void main() {
  float totalLength = max(vTotalLength, 0.0001);
  float tt = mod(vT - uTime * uPulseSpeed, totalLength);
  float n = pnoise(
    vec2(tt * uPulseScale, vLineId * 7.31),
    vec2(totalLength * uPulseScale, 100.0)
  );
  float hardWidth = max(fwidth(n), 0.015);
  float hard = 1.0 - smoothstep(-hardWidth, 0.0, n);
  float soft = 1.0 - smoothstep(-0.45, 0.45, n);
  float pulse = mix(soft, hard, uPulseSharpness);

  // Elevation levels trace in alternating groups of 2-3 (direction decided
  // at extraction). Arc length keeps the front's world-space speed identical
  // on every contour.
  float pathDistance = vTravelDirection > 0.0 ? vT : totalLength - vT;
  float travelled = uIntroTime * uIntroTravelSpeed;
  float reveal = step(pathDistance, travelled);

  vec3 minorColor = mix(uMinorColor, uPulseColor, pulse * uPulseTint);
  float minorBrightness = uMinorBase + (1.0 - uMinorBase) * pulse;
  vec3 minor = minorColor * minorBrightness * uMinorIntensity;
  vec3 major = uMajorColor * uMajorIntensity;
  vec3 color = mix(minor, major, vMajor);
  // Shadow companions: a calm faint echo of the minor color, no pulse.
  color = mix(color, uMinorColor * uShadowIntensity, vShadow);
  color *= reveal;

  float edgeDistance = min(
    min(vTerrainUv.x, 1.0 - vTerrainUv.x),
    min(vTerrainUv.y, 1.0 - vTerrainUv.y)
  );
  color *= smoothstep(0.0, uEdgeFadeWidth, edgeDistance);

  #ifdef USE_FOG
    color *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
  #endif

  float alpha = clamp(max(color.r, max(color.g, color.b)), 0.0, 1.0);
  gl_FragColor = vec4(color, alpha);
}
