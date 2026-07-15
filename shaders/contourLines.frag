#include <fog_pars_fragment>

uniform float uTime;
uniform float uIntroProgress;
uniform vec2 uPeakOrigin;
uniform float uRevealMaxRadius;
uniform float uRevealEdge;
uniform float uRevealStagger;

uniform vec3 uMajorColor;
uniform float uMajorIntensity;
uniform vec3 uMinorColor;
uniform float uMinorIntensity;
uniform float uMinorBase;

uniform vec3 uPulseColor;
uniform float uPulseTint;
uniform float uPulseSpeed;
uniform float uPulseScale;
uniform float uPulseSharpness;

varying float vT;
varying float vTotalLength;
varying float vLineId;
varying float vMajor;
varying float vLevelRank;
varying vec3 vWorldPos;

// Periodic classic Perlin noise (Stefan Gustavson / webgl-noise, MIT) — the
// same generator Lusion pulses their contour lines with.
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
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  return 2.3 * n_xy;
}

void main() {
  // Pulse: periodic noise scrolling along arc length, hard-thresholded at 0
  // with fwidth AA — Lusion's distinct-bordered dashes — mixed with a soft
  // gradient by uPulseSharpness (1.0 = pure hard edges).
  float tt = mod(vT - uTime * uPulseSpeed, vTotalLength);
  float n = pnoise(vec2(tt * uPulseScale, vLineId * 7.31), vec2(vTotalLength * uPulseScale, 100.0));
  float hardWidth = max(fwidth(n), 0.015);
  float hard = 1.0 - smoothstep(-hardWidth, 0.0, n);
  float soft = 1.0 - smoothstep(-0.45, 0.45, n);
  float pulse = mix(soft, hard, uPulseSharpness);

  // Intro reveal: a front expanding radially from the summit, higher
  // contours leading, so lines spread outward and downhill from the peak.
  // At uIntroProgress = 1 every fragment is fully revealed and static.
  float delay = (1.0 - vLevelRank) * uRevealStagger;
  float local = clamp(uIntroProgress * (1.0 + uRevealStagger) - delay, 0.0, 1.0);
  float front = local * uRevealMaxRadius;
  float reveal = 1.0 - smoothstep(front - uRevealEdge, front, distance(vWorldPos.xz, uPeakOrigin));

  // Majors are flat full brightness (Lusion); only thin lines pulse.
  vec3 minorColor = mix(uMinorColor, uPulseColor, pulse * uPulseTint);
  float minorBrightness = uMinorBase + (1.0 - uMinorBase) * pulse;
  vec3 minor = minorColor * minorBrightness * uMinorIntensity;
  vec3 major = uMajorColor * uMajorIntensity;
  vec3 color = mix(minor, major, vMajor);

  color *= reveal;

  #ifdef USE_FOG
    color *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
  #endif

  // Match alpha to additive brightness so unlit areas stay transparent
  // against the page background.
  float alpha = clamp(max(color.r, max(color.g, color.b)), 0.0, 1.0);
  gl_FragColor = vec4(color, alpha);
}
