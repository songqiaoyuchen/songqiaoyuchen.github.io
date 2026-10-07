// About path colour: the route ahead dashed like a trail on a map, the travelled part solid and bright, the
// open end to "Next?" always dashed, terrain-depth occlusion.
#include <fog_pars_fragment>

uniform sampler2D uTerrainDepth;
uniform float uUseTerrainDepth;
uniform float uVisibility;
uniform float uDrawn;
uniform float uOpenFrom;
uniform float uLength;
uniform float uDashLength;
uniform vec3 uTrackColor;
uniform vec3 uDrawnColor;

varying float vAlong;
varying vec2 vScreenUv;

void main() {
  if (uUseTerrainDepth > 0.5) {
    float terrainDepth = texture2D(uTerrainDepth, vScreenUv).r;
    if (gl_FragCoord.z > terrainDepth) discard;
  }

  float drawn = 1.0 - smoothstep(uDrawn - 0.002, uDrawn + 0.002, vAlong);
  // Ahead of the reading head, and on the final stretch to "Next?", the route is a dashed trail.
  if (drawn < 0.5 || vAlong > uOpenFrom) {
    float dash = fract(vAlong * uLength / uDashLength);
    if (dash > 0.55) discard;
  }
  vec3 color = mix(uTrackColor, uDrawnColor, drawn);

  #ifdef USE_FOG
    color *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
  #endif

  float alpha = clamp(max(color.r, max(color.g, color.b)), 0.0, 1.0);
  gl_FragColor = vec4(color, alpha * uVisibility);
}
