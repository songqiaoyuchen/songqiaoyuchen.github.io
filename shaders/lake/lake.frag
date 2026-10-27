// The lake surface: dark still water in the terrain's language under the terrain's own contour at its level,
// brightening with a cyan sheen, slow rings and a soft gold glow along the shore on hover, and stilling to black
// as the dive begins. The terrain cache's depth hides it where the ground stands in front. The water is
// hidden at the map's boundary as the terrain and its lines are: the scene fog, and the terrain's edge fade to
// alpha by plan distance from the plane's centre (TERRAIN_MESH_CONFIG.edgeFade, live from the terrain settings).
#include <fog_pars_fragment>
uniform sampler2D uTerrainDepth;
uniform float uUseTerrainDepth;
uniform mat4 uClipToWorld; // the camera's, as the terrain cache's depth was rendered
uniform float uLevel; // the water's world height
uniform float uOccluderRise; // units above the water a ground point in front must stand to hide the water
uniform float uTime;
uniform float uHover; // 0..1
uniform float uDive; // 0..1, the entry flight
uniform float uVisibility;
uniform vec2 uRadii; // the disc's half axes, world units (vLocal is in world units)
uniform sampler2D uShore; // the water's depth over the contour field about the lake (the level less the ground)
uniform vec2 uShoreScale; // world (x, z) to the field's uv: xz * scale + offset
uniform vec2 uShoreOffset;
uniform vec2 uEdgeFade;
uniform vec3 uWater;
uniform vec3 uGold;
uniform vec3 uCyan;

varying vec2 vScreenUv;
varying vec2 vWorld;
varying float vPlan;
varying vec2 vLocal;
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
  float edgeOpacity = 1.0 - smoothstep(uEdgeFade.x, uEdgeFade.y, vPlan);
  if (edgeOpacity < 0.004) discard;
  // Ground in front of the water hides it only where it stands well above the water's level (a hill between the
  // camera and the lake): ground about the level, whether the shore's own rise or the floor just under the
  // surface, never does, so the shore is where the sampled ground crosses the level whatever the view, and the
  // water's level never seems to move with the camera.
  if (uUseTerrainDepth > 0.5) {
    float terrainDepth = texture2D(uTerrainDepth, vScreenUv).r;
    if (terrainDepth < gl_FragCoord.z) {
      vec4 ground = uClipToWorld * vec4(vScreenUv * 2.0 - 1.0, terrainDepth * 2.0 - 1.0, 1.0);
      if (ground.y / ground.w > uLevel + uOccluderRise) discard;
    }
  }
  // The shore: where the ground stands above the water there is none (the disc only has to reach past it), read
  // from the contour field the drawn lines are marched from, so the cut is the drawn contour at the lake's
  // level and nothing else: the disc's own edge lies off the map, hidden by the fade.
  float shore = texture2D(uShore, vWorld * uShoreScale + uShoreOffset).r;
  if (shore < 0.0) discard;
  // The shore is drawn by the terrain's own contour at the lake's level, so the water adds no line of its own
  // (a second line a hair inside it would show double); on hover a soft gold glow rises under that line, by the
  // shore's rate across the screen so a flat floor gets the same band as a steep bank.
  float shoreRate = max(fwidth(shore), 1e-5);
  float shoreGlow = (1.0 - smoothstep(0.0, 12.0 * shoreRate, shore)) * uHover;

  // The water: dark, with a slow drift of faint ripples that brighten and ring outward on hover.
  vec2 p = vLocal * 1.6;
  float drift = noise(p + vec2(uTime * 0.05, uTime * 0.035)) * 0.5 + noise(p * 2.3 - uTime * 0.04) * 0.25;
  float rings = 0.5 + 0.5 * sin(length(vLocal / uRadii) * 22.0 - uTime * 2.2);
  rings = pow(rings, 6.0) * (1.0 - smoothstep(0.7, 1.0, vRim));
  // Linear light: small numbers read far brighter on screen than they look here.
  vec3 color = uWater + uCyan * drift * 0.012;
  color += uCyan * uHover * (0.012 + rings * 0.05 + drift * 0.015);
  color += uGold * shoreGlow * 0.08;
  // Stilling to black as the camera sinks in.
  color = mix(color, uWater * 0.6, uDive);
  // Opaque water: what lies under it (the ground, the contour lines there) never shows through, but for the
  // terrain's own edge fade, which thins the ground and its lines there by the same measure.
  gl_FragColor = vec4(color * uVisibility, uVisibility * edgeOpacity);
  #include <fog_fragment>
}
