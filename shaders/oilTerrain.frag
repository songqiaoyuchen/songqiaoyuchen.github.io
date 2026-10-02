#include <fog_pars_fragment>
uniform sampler2D pigmentMap;
uniform sampler2D staticLightingMap;
uniform sampler2D reliefMap;
uniform vec2 reliefTexel;
uniform float exposure;
uniform float lightThreshold;
uniform float lightContrast;
uniform float reliefStrength;
uniform float edgeFeather;
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vec3 pigment = texture2D(pigmentMap, vUv).rgb;
  float distanceToCamera = length(cameraPosition - vWorldPosition);
  float nearDetail = 1.0 - smoothstep(16.0, 32.0, distanceToCamera);
  // Raise the actual painted bristles in the surface lighting. The pigment
  // already contains broad tonal planes; only the relief adds local light.
  vec3 dpdx = dFdx(vWorldPosition);
  vec3 dpdy = dFdy(vWorldPosition);
  vec3 normal = normalize(cross(dpdx, dpdy));
  if (!gl_FrontFacing) normal = -normal;
  vec2 gradient = vec2(
    texture2D(reliefMap, vUv + vec2(reliefTexel.x, 0.0)).r
      - texture2D(reliefMap, vUv - vec2(reliefTexel.x, 0.0)).r,
    texture2D(reliefMap, vUv + vec2(0.0, reliefTexel.y)).r
      - texture2D(reliefMap, vUv - vec2(0.0, reliefTexel.y)).r
  ) / (2.0 * reliefTexel);
  vec3 r1 = cross(dpdy, normal);
  vec3 r2 = cross(normal, dpdx);
  float determinant = dot(dpdx, r1);
  vec3 surfaceGradient = (dot(gradient, dFdx(vUv)) * r1
    + dot(gradient, dFdy(vUv)) * r2) / max(abs(determinant), 0.000001);
  vec3 paintNormal = normalize(normal - surfaceGradient * reliefStrength * nearDetail);
  vec3 light = normalize(vec3(-0.5, 0.8, -0.3));
  float raisedLight = dot(paintNormal, light) - dot(normal, light);
  vec3 color = pigment * (1.0 + raisedLight * 0.55);
  vec3 view = normalize(cameraPosition - vWorldPosition);
  vec3 halfVector = normalize(light + view);
  float sheen = pow(max(0.0, dot(paintNormal, halfVector)), 28.0);
  color += vec3(0.14, 0.12, 0.085) * sheen * nearDetail;
  // The shared light pools and terrain shadows govern paint visibility too.
  // Gate sheen together with pigment so unlit bristles cannot fill the void.
  vec2 lighting = texture2D(staticLightingMap, vUv).rg;
  float illumination = lighting.r + lighting.g;
  float lit = 1.0 - exp(-max(0.0, illumination - lightThreshold));
  float visibility = pow(lit, lightContrast);
  color = mix(fogColor, color * exposure, visibility);
  vec2 edgeDistance = min(vUv, 1.0 - vUv);
  float opacity = smoothstep(0.0, edgeFeather, min(edgeDistance.x, edgeDistance.y));
  gl_FragColor = vec4(color, opacity);
  #include <fog_fragment>
}
