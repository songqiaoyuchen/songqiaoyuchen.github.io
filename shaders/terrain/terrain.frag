// Terrain surface colour: base-to-ridge blend lit by the baked two-light lighting map, falling to the background
// with plan distance from the centre (edgeFade) so no camera sees the plane's edge, plus fog.
#include <fog_pars_fragment>

uniform sampler2D staticLightingMap;
uniform vec3  baseColor;
uniform vec3  ridgeColor;
uniform vec3  lightColor;
uniform vec3  light2Color;
uniform vec2 edgeFade;

varying float vHeight;
varying vec2  vUv;
varying vec3 vWorldPosition;

void main() {
  float edgeOpacity = 1.0 - smoothstep(edgeFade.x, edgeFade.y, length(vWorldPosition.xz));

  float heightBlend = pow(vHeight, 1.4);
  vec3 color = mix(baseColor, ridgeColor, heightBlend);
  vec2 staticLighting = texture2D(staticLightingMap, vUv).rg;
  color *= lightColor * staticLighting.r + light2Color * staticLighting.g;

  gl_FragColor = vec4(color, edgeOpacity);
  #include <fog_fragment>
}
