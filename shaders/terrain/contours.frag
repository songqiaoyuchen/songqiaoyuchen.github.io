// Contour colour: minor/major/shadow lines, the travelling pulse, the intro sweep and terrain-depth occlusion.
// About's map options: lines keep full brightness near the route; away from it they darken to a floor,
// lower still on unlit ground (the terrain's baked lighting), instead of vanishing.
#include <fog_pars_fragment>

uniform float uIntroTime;
uniform float uVisibility;
uniform float uIntroTravelSpeed;
// Plan distance from the centre where lines start to fade with the ground, and where they are gone.
uniform vec2 uEdgeFade;
uniform sampler2D uTerrainDepth;
uniform float uUseTerrainDepth;
uniform float uPlaneSize;
// xy: focus centre (world x, z); z, w: distance where the dimming starts and where it bottoms out.
uniform vec4 uFocus;
uniform float uFocusFloor;
uniform float uUseFocus;
uniform sampler2D uLightingMap;
// x: brightness kept on unlit ground; y: baked light at which lines reach full brightness.
uniform vec2 uLit;
uniform float uUseLit;

uniform vec3 uMajorColor;
uniform float uMajorIntensity;
uniform vec3 uMinorColor;
uniform float uMinorIntensity;
uniform float uMinorBase;
uniform float uShadowIntensity;

uniform vec3 uPulseColor;
uniform float uPulseTint;
uniform float uPulseSharpness;

varying float vT;
varying float vTotalLength;
varying float vMajor;
varying float vTravelDirection;
varying float vShadow;
varying vec2 vTerrainUv;
varying float vNoise;
varying vec2 vScreenUv;
varying float vThin;

void main() {
  if (uUseTerrainDepth > 0.5) {
    float terrainDepth = texture2D(uTerrainDepth, vScreenUv).r;
    if (gl_FragCoord.z > terrainDepth) discard;
  }

  float totalLength = max(vTotalLength, 0.0001);
  float n = vNoise;
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

  vec2 world = (vTerrainUv - 0.5) * uPlaneSize;
  float edgeOpacity = 1.0 - smoothstep(uEdgeFade.x, uEdgeFade.y, length(world));

  // Alpha follows colour, so dimming by the square root scales the light by the widening.
  color *= sqrt(vThin);

  // 0 near the focus (About's route), 1 in the background.
  float away = 0.0;
  if (uUseFocus > 0.5) {
    away = smoothstep(uFocus.z, uFocus.w, distance(world, uFocus.xy));
  }
  if (uUseLit > 0.5) {
    // The terrain mesh's uv runs opposite in z to the plan uv used here.
    vec2 lighting = texture2D(uLightingMap, vec2(vTerrainUv.x, 1.0 - vTerrainUv.y)).rg;
    float lit = mix(uLit.x, 1.0, smoothstep(0.0, uLit.y, lighting.r + lighting.g));
    color *= mix(1.0, lit, uUseFocus > 0.5 ? away : 1.0);
  }
  // Darkening the colour also lowers the additive alpha below, so the floor acts roughly squared.
  color *= mix(1.0, uFocusFloor, away);

  #ifdef USE_FOG
    color *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
  #endif

  float alpha = clamp(max(color.r, max(color.g, color.b)), 0.0, 1.0);
  alpha *= edgeOpacity;
  gl_FragColor = vec4(color, alpha * uVisibility);
}
