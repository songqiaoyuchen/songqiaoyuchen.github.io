#include <fog_pars_fragment>

uniform float uTime;
uniform float uHover;
uniform float uIntroProgress;
uniform float uShellAlpha;

uniform float uMajorEvery;
uniform float uThickContourWidth;
uniform float uThickIntensity;
uniform vec3  uThickColor;

uniform float uThinContourDensity;
uniform float uThinContourWidth;
uniform float uThinIntensity;
uniform vec3  uThinColor;

uniform float uFlowStrength;
uniform float uFlowSpeed;
uniform vec3  uFlowColor;

uniform float uHoverBoost;

varying float vHeight;
varying vec2  vUv;

// Anti-aliased line down the middle of each height band; fades out once the
// bands become subpixel-dense in the distance instead of shimmering.
// Width is capped in screen space (maxPx) so flat terrain doesn't flood with
// glow where a height-based width would grow unbounded.
float contourLine(float coord, float width, float maxPx) {
  float fw = fwidth(coord);
  float w = min(width, fw * maxPx);
  float d = abs(fract(coord) - 0.5);
  float aa = max(fw * 0.75, 0.004);
  float line = 1.0 - smoothstep(w, w + aa, d);
  return line * (1.0 - smoothstep(0.3, 0.8, fw));
}

void main() {
  // One shared contour series with a slow drift and spatial wobble; every
  // uMajorEvery-th line is the bright "index" contour (topo-map style), so
  // thick and thin lines interleave at regular intervals.
  float wobble = 0.006 * sin(vUv.x * 21.0 + vUv.y * 13.0 + uTime * 0.4);
  float coord = (vHeight + wobble) * uThinContourDensity + uTime * 0.05;

  // Thin lines sit at coord = k + 0.5; remapping so every uMajorEvery-th of
  // those centers lands on a major line center.
  float majorCoord = (coord - 0.5) / uMajorEvery + 0.5;

  // Intro: major contours materialize first, minor ones fill in after.
  float p = uIntroProgress;
  float thick = contourLine(majorCoord, uThickContourWidth, 4.0) * smoothstep(0.05, 0.55, p);
  float thin  = contourLine(coord, uThinContourWidth, 1.75) * smoothstep(0.35, 0.95, p);
  // Where a major line sits, suppress the coinciding minor line.
  thin *= 1.0 - thick;

  // Light-flow pass: bright bands sweeping diagonally along the contour lines,
  // strengthened by hover.
  float flowCoord = dot(vUv, vec2(0.85, 0.55));
  float flow = pow(max(sin((flowCoord * 2.0 - uTime * uFlowSpeed) * 6.28318), 0.0), 6.0);
  float flowAmt = flow * uFlowStrength * (0.35 + 0.65 * uHover);

  // Intro scan: one bright line sweeps across the shell as it materializes.
  float scanPos = mix(-0.2, 1.4, smoothstep(0.0, 0.9, p));
  float scan = exp(-pow((flowCoord - scanPos) * 7.0, 2.0)) * (1.0 - smoothstep(0.75, 1.0, p)) * 2.5;

  float brightness = 1.0 + uHover * uHoverBoost;

  vec3 col = uThickColor * thick * uThickIntensity
           + uThinColor  * thin  * uThinIntensity;
  col *= brightness;
  col += uFlowColor * (thick + 0.5 * thin) * (flowAmt + scan);

  col *= uShellAlpha * smoothstep(0.0, 0.25, p);

  #ifdef USE_FOG
    // Additive blending: attenuate toward black instead of mixing to fog color.
    col *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
  #endif

  // Alpha follows the glow: the canvas is transparent and additive blending
  // sums alpha too, so a constant 1.0 would stamp an opaque black shell
  // silhouette over the page background wherever no line is lit.
  gl_FragColor = vec4(col, clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0));
}
