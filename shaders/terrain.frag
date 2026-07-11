#include <fog_pars_fragment>

uniform sampler2D gradientMap;
uniform float elevation;
uniform float seaLevel;
uniform vec3  baseColor;
uniform vec3  ridgeColor;
uniform vec3  lightDir;
uniform float lightIntensity;

varying float vHeight;
varying vec2  vUv;

void main() {
  // gradientMap stores d(pow(height, contrast)) per world unit along the local
  // plane axes, baked at full heightmap resolution. seaLevel and elevation are
  // applied here so the Leva controls stay live for lighting.
  vec2 g = texture2D(gradientMap, vUv).rg * (elevation / max(1.0 - seaLevel, 0.0001));

  // World-space normal — mesh rotation is -PI/2 around X: local(x,y,z) → world(x,z,−y)
  vec3 localNormal = normalize(vec3(-g.x, -g.y, 1.0));
  vec3 normal = vec3(localNormal.x, localNormal.z, -localNormal.y);

  // Matches the old per-vertex slope: height delta across ±1/512 UV, scaled by 0.1
  float slope = clamp(length(g) * (2.0 * 22.0 / 512.0) * 0.1, 0.0, 1.0);

  float heightBlend = pow(vHeight, 1.4);
  vec3 color = mix(baseColor, ridgeColor, heightBlend);

  // Steep slopes slightly darker (shadowed cliffs)
  color *= 1.0 - slope * 0.3;

  // Diffuse lighting with constant ambient floor
  float diffuse = max(dot(normal, lightDir), 0.0);
  float ambient = 0.3;
  color *= ambient + (1.0 - ambient) * diffuse * lightIntensity;

  gl_FragColor = vec4(color, 1.0);
  #include <fog_fragment>
}
