#include <fog_pars_fragment>

uniform vec3  baseColor;
uniform vec3  ridgeColor;
uniform vec3  lightDir;
uniform float lightIntensity;
uniform bool  fadeEnabled;
uniform float fadeHeight;
uniform float fadeFalloff;

varying float vHeight;
varying float vSlope;
varying vec3  vNormal;

void main() {
  float alpha = 1.0;
  if (fadeEnabled) {
    // Everything <= fadeHeight will not be rendered
    if (vHeight <= fadeHeight) discard;

    alpha = smoothstep(0.0, 1.0, (vHeight - fadeHeight) * fadeFalloff);
    if (alpha <= 0.001) discard;
  }

  float heightBlend = pow(vHeight, 1.4);
  vec3 color = mix(baseColor, ridgeColor, heightBlend);

  // Steep slopes slightly darker (shadowed cliffs)
  color *= 1.0 - vSlope * 0.3;

  // Diffuse lighting with constant ambient floor
  float diffuse = max(dot(vNormal, lightDir), 0.0);
  float ambient = 0.3;
  color *= ambient + (1.0 - ambient) * diffuse * lightIntensity;

  gl_FragColor = vec4(color, alpha);
  #include <fog_fragment>
}
