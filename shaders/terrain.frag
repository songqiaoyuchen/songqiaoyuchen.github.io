#include <fog_pars_fragment>

uniform sampler2D staticLightingMap;
uniform vec3  baseColor;
uniform vec3  ridgeColor;
uniform float edgeFeather;

varying float vHeight;
varying vec2  vUv;

void main() {
  vec2 edgeDistance = min(vUv, 1.0 - vUv);
  float edgeOpacity = smoothstep(
    0.0,
    edgeFeather,
    min(edgeDistance.x, edgeDistance.y)
  );

  float heightBlend = pow(vHeight, 1.4);
  vec3 color = mix(baseColor, ridgeColor, heightBlend);
  color *= texture2D(staticLightingMap, vUv).rgb;

  gl_FragColor = vec4(color, edgeOpacity);
  #include <fog_fragment>
}
