#version 300 es
// The intro's cover on the page: paper is the preloader's black with its faint gold glow; the brush's lines (at the
// page's resolution, one stroke wide) are gold; where a line's band has widened (the cover texture), its edge is
// the gold line and its inside is see-through to the scene, once the reveal has opened the lines (uClear). Before
// that the lines are simply gold. Premultiplied alpha over the scene; uFade lifts the last of the cover.
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uInk;    // the widening bands, at their own (lower) resolution
uniform sampler2D uBrush;  // the map's lines, at the page's resolution
uniform vec3 uPaper;
uniform vec3 uStain;
uniform vec3 uGlow;    // the paper's glow colour (premultiplied by its strength)
uniform float uClear;  // 0: the lines are gold; 1: the inside of a widened band shows the scene
uniform float uFade;

void main() {
  float band = texture(uInk, vUv).r;
  float line = smoothstep(0.1, 0.6, texture(uBrush, vUv).r);
  // The band's edge is a line too: gold over the ramp, open past it.
  float edge = smoothstep(0.25, 0.7, band);
  float open = smoothstep(0.45, 0.85, max(band, line)) * uClear;
  float gold = max(line, edge * (1.0 - open));
  // The preloader's background: black with an ellipse of gold low on the page.
  vec2 glowOffset = (vUv - vec2(0.5, 0.22)) / vec2(0.62, 0.48);
  float glow = smoothstep(0.72, 0.0, length(glowOffset));
  vec3 colour = mix(uPaper + uGlow * glow, uStain, gold);
  float alpha = (1.0 - open) * (1.0 - uFade);
  fragColor = vec4(colour * alpha, alpha);
}
