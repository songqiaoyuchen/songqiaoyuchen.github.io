// Six-density hatching adapted from knowercoder/SketchEffect (MIT).
// Attribution: public/textures/terrain/sketch-effect-LICENSE.txt
// Paper noise retains its attribution in pencil-LICENSE.txt.
#include <fog_pars_fragment>

uniform sampler2D heightmap;
uniform sampler2D staticLightingMap;
uniform sampler2D noiseTexture;
uniform sampler2D hatchDark;
uniform sampler2D hatchBright;
uniform vec2 heightTexel;
uniform float elevation;
uniform float contrast;
uniform float seaLevel;
uniform float planeSize;
uniform float edgeFeather;
uniform float hatchScale;
uniform float pencilExposure;
uniform vec3 lightColor;
uniform vec3 light2Color;
uniform vec3 inkColor;
uniform vec3 paperColor;

varying vec2 vUv;
varying float vHeight;
varying vec3 vWorldPosition;

float heightAt(vec2 uv) {
  float h = pow(max(texture2D(heightmap, uv).r, 0.0), contrast);
  return clamp((h - seaLevel) / max(1.0 - seaLevel, .0001), 0.0, 1.0) * elevation;
}

// Smooth normals from the displaced surface, independent of triangle boundaries.
vec3 surfaceNormal() {
  vec2 stepUV = heightTexel * 2.0;
  float dx = heightAt(vUv + vec2(stepUV.x, 0.0)) - heightAt(vUv - vec2(stepUV.x, 0.0));
  float dz = heightAt(vUv + vec2(0.0, stepUV.y)) - heightAt(vUv - vec2(0.0, stepUV.y));
  return normalize(vec3(-dx / (2.0 * stepUV.x * planeSize), 1.0, dz / (2.0 * stepUV.y * planeSize)));
}

float hatchField(vec2 p, float intensity) {
  vec3 dark = texture2D(hatchDark, p).rgb;
  vec3 bright = texture2D(hatchBright, p).rgb;
  vec3 weightsA = clamp(intensity * 6.0 - vec3(0.0, 1.0, 2.0), 0.0, 1.0);
  vec3 weightsB = clamp(intensity * 6.0 - vec3(3.0, 4.0, 5.0), 0.0, 1.0);
  weightsA.xy -= weightsA.yz;
  weightsA.z -= weightsB.x;
  weightsB.xy -= weightsB.yz;
  return dot(dark, weightsA) + dot(bright, weightsB);
}

float surfaceHatch(vec3 p, vec3 normal, float intensity) {
  vec3 layers = vec3(
    hatchField(p.yz, intensity),
    hatchField(p.zx, intensity),
    hatchField(p.xy, intensity)
  );
  vec3 weights = pow(abs(normal), vec3(4.0));
  return dot(layers, weights / max(dot(weights, vec3(1.0)), .0001));
}

void main() {
  vec3 normal = surfaceNormal();
  vec2 lighting = texture2D(staticLightingMap, vUv).rg;
  float illumination = dot(lightColor * lighting.r + light2Color * lighting.g, vec3(.299, .587, .114));
  float tone = 1.0 - exp(-illumination * pencilExposure);
  tone *= smoothstep(.002, .035, vHeight);

  // Three-dimensional coordinates keep marks attached through camera movement.
  vec3 p = vWorldPosition * hatchScale;
  // Reverse the source's graphite-on-white response for pale pencil on dark
  // paper: illuminated planes collect more marks, unlit terrain stays empty.
  float deposit = 1.0 - surfaceHatch(p, normal, 1.0 - tone * .88);

  vec2 paperUV = gl_FragCoord.xy / 256.0;
  float tooth = texture2D(noiseTexture, paperUV).r;
  float fineGrain = texture2D(noiseTexture, paperUV * 2.73 + .17).r;
  deposit *= smoothstep(.025, .3, tone) * (.8 + .2 * tooth) * (.9 + .1 * fineGrain);
  // Paper changes pigment pickup, never the brightness of untouched background.
  vec3 color = mix(paperColor, inkColor, deposit);
  vec2 edgeDistance = min(vUv, 1.0 - vUv);
  float alpha = smoothstep(0.0, edgeFeather, min(edgeDistance.x, edgeDistance.y));
  gl_FragColor = vec4(color, alpha);
  #include <fog_fragment>
}
