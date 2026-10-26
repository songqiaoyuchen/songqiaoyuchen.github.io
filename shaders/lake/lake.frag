// The lake surface: dark still water in the terrain's language, a gold shoreline where the ground meets it and a
// faint drawn rim where the water is cut, brightening with a cyan sheen and slow rings on hover, and stilling to
// black as the dive begins. The terrain cache's depth hides it where the ground stands in front.
uniform sampler2D uTerrainDepth;
uniform float uUseTerrainDepth;
uniform float uTime;
uniform float uHover; // 0..1
uniform float uDive; // 0..1, the entry flight
uniform float uVisibility;
uniform vec2 uRadii; // the disc's half axes, world units (vLocal is in world units)
uniform float uShoreNoise;
uniform vec3 uWater;
uniform vec3 uGold;
uniform vec3 uCyan;

varying vec2 vScreenUv;
varying vec2 vLocal;
varying float vShore;
varying float vRim;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
}

void main() {
  if (uUseTerrainDepth > 0.5) {
    float terrainDepth = texture2D(uTerrainDepth, vScreenUv).r;
    if (gl_FragCoord.z > terrainDepth) discard;
  }
  // The shore the water is cut to: the disc's edge moved in and out by noise around it.
  float angle = atan(vLocal.y, vLocal.x);
  float wobble = noise(vec2(angle * 1.4 + 3.0, 1.7)) * 2.0 - 1.0;
  wobble += 0.5 * (noise(vec2(angle * 3.1 + 9.0, 4.2)) * 2.0 - 1.0);
  float edge = 1.0 + uShoreNoise * wobble;
  float cut = vRim / edge; // 1 at the cut shore
  if (cut > 1.0) discard;
  float toShore = 1.0 - cut;
  // Ground just under the water also reads as shore (the terrain's own cut lies a little further in).
  float shallow = 1.0 - smoothstep(0.0, 0.045, vShore);
  float shoreLine = max(1.0 - smoothstep(0.0, 0.03, toShore), shallow * 0.5);
  float shoreGlow = max(exp(-toShore * 9.0), shallow * 0.7) * 0.3;

  // The water: dark, with a slow drift of faint ripples that brighten and ring outward on hover.
  vec2 p = vLocal * 1.6;
  float drift = noise(p + vec2(uTime * 0.05, uTime * 0.035)) * 0.5 + noise(p * 2.3 - uTime * 0.04) * 0.25;
  float rings = 0.5 + 0.5 * sin(length(vLocal / uRadii) * 22.0 - uTime * 2.2);
  rings = pow(rings, 6.0) * (1.0 - smoothstep(0.7, 1.0, cut));
  // Linear light: small numbers read far brighter on screen than they look here.
  vec3 color = uWater + uCyan * drift * 0.012;
  color += uCyan * uHover * (0.012 + rings * 0.05 + drift * 0.015);
  color += uGold * (shoreGlow * (0.12 + 0.2 * uHover) + shoreLine * (0.4 + 0.5 * uHover));
  // Stilling to black as the camera sinks in.
  color = mix(color, uWater * 0.6, uDive);
  float alpha = (0.9 + 0.1 * uHover) * uVisibility;
  gl_FragColor = vec4(color * uVisibility, alpha);
}
