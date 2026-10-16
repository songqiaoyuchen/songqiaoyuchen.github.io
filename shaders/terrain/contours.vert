// Contour tubes: lifts each line onto the displaced terrain and carries arc length for the pulse; on the intro,
// reads how far the reveal's wave is past each point.
// With uMinPixels set (About's map), distant tubes keep a minimum on-screen radius and dim instead of breaking up.
// On the way to Places (uMorph) the homepage lines ride onto the globe with the terrain (the same wrap as
// terrain.vert, about the same pivot), their tubes shrinking with it down to a minimum on-screen radius.
#include <fog_pars_vertex>

attribute float t;
attribute float totalLength;
attribute float lineId;
attribute float major;
attribute float shadow;

uniform float uElevation;
uniform float uLift;
uniform float uMeshY;
uniform float uMinorRadius;
uniform float uMajorRadius;
uniform float uDepthBias;
uniform float uPlaneSize;
uniform float uTime;
uniform float uPulseSpeed;
uniform float uPulseScale;
uniform float uMinPixels; // minimum on-screen tube radius in drawing-buffer pixels; 0 = off
uniform float uViewportHeight; // drawing-buffer pixels
uniform float uMorph;
uniform vec3 uGlobeCenter;
uniform float uGlobeRadius;
uniform vec3 uPatchAnchor;
uniform vec3 uPatchEast;
uniform vec3 uPatchNorth;
uniform vec2 uPatchPivot; // plane-local (x, -z) point that lands on the anchor
uniform float uPatchScale; // world units of arc on the planet per landscape unit, this frame
uniform float uPatchRelief; // height factor on the planet, this frame
uniform float uSeaUnits; // the landing place's elevation, landscape units
uniform float uDatumY; // the terrain surface's world y at the pivot
// The intro reveal (IntroReveal): a wave spreads from the summit over the ground at uRevealSpeed, and each line
// shows where the wave has passed, flashing just behind its front. The reach field (lib/terrain/reach.ts, built
// by the terrain worker) holds every point's distance from the summit over the surface, as a share of uReachMax.
uniform float uRevealTime; // seconds into the intro
uniform float uRevealDelay; // seconds before the wave sets off
uniform float uRevealSpeed; // world units of surface per second
uniform float uRevealFlashUnits; // the flash's decay behind the front, world units
uniform float uRevealFlashRadius; // how much wider the tube is at the flash's peak
uniform sampler2D uReach;
uniform float uReachMax;
uniform float uReachReady; // 0 until the field has arrived: the lines show whole

varying float vRevealBehind; // world units the wave's front is past this point (negative: not yet there)
varying float vMajor;
varying float vShadow;
varying vec2 vTerrainUv;
varying float vNoise;
varying vec2 vScreenUv;
varying float vThin;

// Periodic classic Perlin noise (Stefan Gustavson / webgl-noise, MIT).
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 value) {
  return value * value * value * (value * (value * 6.0 - 15.0) + 10.0);
}

float pnoise(vec2 point, vec2 repetition) {
  vec4 pi = floor(point.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 pf = fract(point.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  pi = mod(pi, repetition.xyxy);
  pi = mod289(pi);
  vec4 ix = pi.xzxz;
  vec4 iy = pi.yyww;
  vec4 fx = pf.xzxz;
  vec4 fy = pf.yyww;
  vec4 permutation = permute(permute(ix) + iy);
  vec4 gx = fract(permutation * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx -= tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(
    dot(g00, g00),
    dot(g01, g01),
    dot(g10, g10),
    dot(g11, g11)
  ));
  g00 *= norm.x;
  g01 *= norm.y;
  g10 *= norm.z;
  g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fadeXY = fade(pf.xy);
  vec2 nx = mix(vec2(n00, n01), vec2(n10, n11), fadeXY.x);
  return 2.3 * mix(nx.x, nx.y, fadeXY.y);
}

// The plane's uv at a plan position (as the terrain's maps are laid out: v runs opposite to z).
vec2 planUv(vec2 plan) {
  return vec2(plan.x / uPlaneSize + 0.5, 0.5 - plan.y / uPlaneSize);
}

void main() {
  // How far the wave's front is past this point along the ground.
  float front = uRevealSpeed * (uRevealTime - uRevealDelay);
  vRevealBehind = uReachReady > 0.5 ? front - texture2D(uReach, planUv(position.xz)).r * uReachMax : 1.0e4;
  // Major placement is decided at extraction (every-Nth, min-height gated).
  vMajor = major;
  vShadow = shadow;
  float safeLength = max(totalLength, 0.0001);
  float noisePosition = mod(t - uTime * uPulseSpeed, safeLength);
  vNoise = pnoise(
    vec2(noisePosition * uPulseScale, lineId * 7.31),
    vec2(safeLength * uPulseScale, 100.0)
  );

  vec3 center = vec3(
    position.x,
    position.y * uElevation + uLift + uMeshY,
    position.z
  );
  float flash = vRevealBehind >= 0.0 ? exp(-vRevealBehind / max(uRevealFlashUnits, 0.0001)) : 0.0;
  float radius = mix(uMinorRadius, uMajorRadius, vMajor) * (1.0 + uRevealFlashRadius * flash);
  vec3 tubeNormal = normal;
  vTerrainUv = (center + normal * radius).xz / uPlaneSize + 0.5;
  if (uMorph > 0.0) {
    // The ride: plane x is world x, plane y is world -z, both flipped onto east/north (as terrain.vert).
    vec2 local = vec2(center.x, -center.z) - uPatchPivot;
    vec3 tangent = uPatchAnchor * uGlobeRadius - (uPatchEast * local.x + uPatchNorth * local.y) * uPatchScale;
    vec3 direction = normalize(tangent);
    // Above sea level by the line's own height plus the landing place's elevation (as terrain.vert).
    float standOff = uGlobeRadius + (center.y - uDatumY) * uPatchRelief + uSeaUnits * uPatchScale;
    vec3 onGlobe = uGlobeCenter + direction * standOff;
    float ride = smoothstep(0.0, 0.05, uMorph);
    center = mix(center, onGlobe, ride);
    // The tube's cross-section turns with the surface and shrinks with the map.
    vec3 turned = -uPatchEast * normal.x + uPatchNorth * normal.z + direction * normal.y;
    tubeNormal = normalize(mix(normal, turned, ride));
    radius *= mix(1.0, uPatchScale, ride);
  }
  vThin = 1.0;
  if (uMinPixels > 0.0) {
    float centerW = (projectionMatrix * modelViewMatrix * vec4(center, 1.0)).w;
    float pixelsPerUnit = projectionMatrix[1][1] * uViewportHeight * 0.5 / max(centerW, 0.0001);
    float minRadius = uMinPixels / pixelsPerUnit;
    // Widened tubes give back the light their extra width adds.
    vThin = radius / max(radius, minRadius);
    radius = max(radius, minRadius);
  }
  vec3 pos = center + tubeNormal * radius;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_Position.z -= uDepthBias * gl_Position.w;
  vScreenUv = gl_Position.xy / gl_Position.w * 0.5 + 0.5;

  #include <fog_vertex>
}
