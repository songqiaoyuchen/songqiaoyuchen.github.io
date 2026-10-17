#version 300 es
// The intro's reveal, one step: the lines widen. The cover texture (red channel, 0 paper to 1 open) takes the most
// of its neighbours a fraction of a texel away, so every line's band grows outward evenly at uGrow texels a step,
// and the brush (the contour map's lines, finer than this texture) keeps the lines themselves at full. Ping-ponged
// by IntroInk.tsx once a frame, from the moment the map is complete.
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uInk;
uniform sampler2D uBrush;
uniform vec2 uTexel;
uniform float uGrow; // texels the bands widen this step

void main() {
  float open = texture(uInk, vUv).r;
  vec2 g = uTexel * uGrow;
  vec2 d = g * 0.7071;
  open = max(open, texture(uInk, vUv + vec2(g.x, 0.0)).r);
  open = max(open, texture(uInk, vUv - vec2(g.x, 0.0)).r);
  open = max(open, texture(uInk, vUv + vec2(0.0, g.y)).r);
  open = max(open, texture(uInk, vUv - vec2(0.0, g.y)).r);
  open = max(open, texture(uInk, vUv + d).r);
  open = max(open, texture(uInk, vUv - d).r);
  open = max(open, texture(uInk, vUv + vec2(d.x, -d.y)).r);
  open = max(open, texture(uInk, vUv - vec2(d.x, -d.y)).r);
  // A line lands here at part density (the brush is finer): taken as full.
  open = max(open, smoothstep(0.05, 0.22, texture(uBrush, vUv).r));
  fragColor = vec4(clamp(open, 0.0, 1.0), 0.0, 0.0, 1.0);
}
