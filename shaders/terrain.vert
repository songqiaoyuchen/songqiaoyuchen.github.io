#include <fog_pars_vertex>

uniform sampler2D heightmap;
uniform float elevation;
uniform float contrast;
uniform float seaLevel;

varying float vHeight;
varying float vSlope;
varying vec3  vNormal;

float processH(float raw) {
  float h = pow(raw, contrast);
  return clamp((h - seaLevel) / max(1.0 - seaLevel, 0.0001), 0.0, 1.0);
}

void main() {
  float texel = 1.0 / 512.0;

  float h  = processH(texture2D(heightmap, uv).r);
  float hL = processH(texture2D(heightmap, uv + vec2(-texel, 0.0)).r);
  float hR = processH(texture2D(heightmap, uv + vec2( texel, 0.0)).r);
  float hD = processH(texture2D(heightmap, uv + vec2(0.0, -texel)).r);
  float hU = processH(texture2D(heightmap, uv + vec2(0.0,  texel)).r);

  float dX = (hR - hL) * elevation;
  float dY = (hU - hD) * elevation;
  vSlope  = clamp(length(vec2(dX, dY)) * 0.1, 0.0, 1.0);
  vHeight = h;

  // World-space normal — mesh rotation is -PI/2 around X: local(x,y,z) → world(x,z,−y)
  // texelLocal: UV texel width in local plane units (planeSize=22, textureRes=512)
  float texelLocal = 22.0 / 512.0;
  float dzdx = (hR - hL) * elevation / (2.0 * texelLocal);
  float dzdy = (hU - hD) * elevation / (2.0 * texelLocal);
  vec3 localNormal = normalize(vec3(-dzdx, -dzdy, 1.0));
  vNormal = vec3(localNormal.x, localNormal.z, -localNormal.y);

  vec3 pos = position;
  pos.z += h * elevation;
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
