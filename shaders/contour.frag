#include <fog_pars_fragment>

// Animation
uniform float uTime;
uniform float uHover;
uniform float uIntroProgress;
uniform float uIntroScanProgress;
uniform float uShellAlpha;
uniform float uHoverBoost;

// Contours
uniform float uMajorEvery;
uniform float uThickContourWidth;
uniform float uThickIntensity;
uniform vec3 uThickColor;
uniform float uThinContourDensity;
uniform float uThinContourWidth;
uniform float uThinIntensity;
uniform vec3 uThinColor;

// Flow
uniform float uFlowStrength;
uniform float uFlowSpeed;
uniform vec3 uFlowColor;

varying float vHeight;
varying vec2 vUv;

const float TAU = 6.2831853;

// Draw an anti-aliased band and fade it when contours become subpixel-dense.
float contourLine(float coord, float width, float maxPx) {
  float pixelWidth = fwidth(coord);
  float halfWidth = min(width, pixelWidth * maxPx);
  float distanceToLine = abs(fract(coord) - 0.5);
  float antialias = max(pixelWidth * 0.75, 0.004);

  float line = 1.0 - smoothstep(halfWidth, halfWidth + antialias, distanceToLine);
  return line * (1.0 - smoothstep(0.3, 0.8, pixelWidth));
}

void main() {
  // Build major and minor lines from one animated contour scale.
  float wobble = 0.006 * sin(vUv.x * 21.0 + vUv.y * 13.0 + uTime * 0.4);
  float coord = (vHeight + wobble) * uThinContourDensity + uTime * 0.05;
  float majorCoord = (coord - 0.5) / uMajorEvery + 0.5;

  float thick = contourLine(majorCoord, uThickContourWidth, 4.0);
  float thin = contourLine(coord, uThinContourWidth, 1.75);
  thick *= smoothstep(0.05, 0.55, uIntroProgress);
  thin *= smoothstep(0.35, 0.95, uIntroProgress) * (1.0 - thick);

  // Add the moving highlight and one-time intro scan.
  float flowCoord = dot(vUv, vec2(0.85, 0.55));
  float flow = pow(max(sin((flowCoord * 2.0 - uTime * uFlowSpeed) * TAU), 0.0), 6.0);
  flow *= uFlowStrength * mix(0.35, 1.0, uHover);

  float scanPosition = mix(-0.2, 1.4, smoothstep(0.0, 0.9, uIntroScanProgress));
  float scan = exp(-pow((flowCoord - scanPosition) * 7.0, 2.0));
  scan *= (1.0 - smoothstep(0.75, 1.0, uIntroScanProgress)) * 2.5;

  // Combine the base contours and animated highlights.
  vec3 color = uThickColor * thick * uThickIntensity;
  color += uThinColor * thin * uThinIntensity;
  color *= 1.0 + uHover * uHoverBoost;
  color += uFlowColor * (thick + 0.5 * thin) * (flow + scan);
  color *= uShellAlpha * smoothstep(0.0, 0.25, uIntroProgress);

  #ifdef USE_FOG
    color *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
  #endif

  // Match alpha to additive brightness so unlit areas stay transparent.
  float alpha = clamp(max(color.r, max(color.g, color.b)), 0.0, 1.0);
  gl_FragColor = vec4(color, alpha);
}
