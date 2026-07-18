#include <fog_pars_fragment>

uniform sampler2D heightmap;
uniform sampler2D gradientMap;
uniform float elevation;
uniform float contrast;
uniform float seaLevel;
uniform vec3  baseColor;
uniform vec3  ridgeColor;
uniform vec3  lightColor;
uniform vec3  lightPos;
uniform float lightIntensity;
uniform float lightFalloff;
uniform vec3  light2Color;
uniform vec3  light2Pos;
uniform float light2Intensity;
uniform float light2Falloff;
uniform float shadowStrength;
uniform float shadowBias;
uniform float planeSize;
uniform float meshY;

varying float vHeight;
varying vec2  vUv;
varying vec3  vWorldPos;

float processH(float raw) {
  float h = pow(max(raw, 0.0), contrast);
  return clamp((h - seaLevel) / max(1.0 - seaLevel, 0.0001), 0.0, 1.0);
}

// The terrain is a height field, so a short ray in UV space is enough to
// create the deep basin shadows that a normal-only point light cannot make.
// The fixed loop is WebGL-friendly; strength and bias remain live art controls.
float terrainShadow(vec2 receiverUv, vec3 receiverWorldPos, vec3 sourcePos) {
  vec2 lightUv = vec2(
    sourcePos.x / planeSize + 0.5,
    0.5 - sourcePos.z / planeSize
  );

  float visibility = 1.0;
  const int SHADOW_STEPS = 10;
  for (int i = 1; i < SHADOW_STEPS; i++) {
    float t = float(i) / float(SHADOW_STEPS);
    vec2 sampleUv = mix(receiverUv, lightUv, t);
    float terrainY = meshY + processH(texture2D(heightmap, sampleUv).r) * elevation;
    float rayY = mix(receiverWorldPos.y + shadowBias, sourcePos.y, t);

    // A small soft band prevents the ray-marched shadow edge from stair-stepping.
    float sampleVisibility = smoothstep(-0.04, 0.18, rayY - terrainY);
    visibility = min(visibility, sampleVisibility);
  }

  return mix(1.0, visibility, shadowStrength);
}

vec3 pointLightContribution(
  vec3 sourcePos,
  vec3 sourceColor,
  float sourceIntensity,
  float sourceFalloff,
  vec3 normal,
  vec3 albedo
) {
  vec3 toLight = sourcePos - vWorldPos;
  float lightDist = max(length(toLight), 1e-4);
  vec3 L = toLight / lightDist;

  float atten = 1.0 / (0.05 + sourceFalloff * lightDist * lightDist);
  float diff = max(dot(normal, L), 0.0);
  float shadow = terrainShadow(vUv, vWorldPos, sourcePos);

  return albedo * sourceColor * sourceIntensity * atten * diff * shadow;
}

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

  color = pointLightContribution(
            lightPos, lightColor, lightIntensity, lightFalloff, normal, color
          )
        + pointLightContribution(
            light2Pos, light2Color, light2Intensity, light2Falloff, normal, color
          );

  gl_FragColor = vec4(color, 1.0);
  #include <fog_fragment>
}
