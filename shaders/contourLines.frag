#include <fog_pars_fragment>

uniform float uIntroTime;
uniform float uIntroTravelSpeed;
uniform float uEdgeFeather;
uniform sampler2D uTerrainDepth;
uniform float uUseTerrainDepth;

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

  vec2 edgeDistance = min(vTerrainUv, 1.0 - vTerrainUv);
  float edgeOpacity = smoothstep(
    0.0,
    uEdgeFeather,
    min(edgeDistance.x, edgeDistance.y)
  );

  #ifdef USE_FOG
    color *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
  #endif

  float alpha = clamp(max(color.r, max(color.g, color.b)), 0.0, 1.0);
  alpha *= edgeOpacity;
  gl_FragColor = vec4(color, alpha);
}
