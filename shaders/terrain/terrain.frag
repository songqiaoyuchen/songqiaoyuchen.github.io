// Terrain surface colour: base-to-ridge blend lit by the baked two-light lighting map, falling to the background
// with plan distance from the centre (edgeFade) so no camera sees the plane's edge, plus fog. Riding to Places it
// takes the globe's land shading instead (landShading.glsl, uRideBlend): the same north-west hillshade on its own
// relief, read from the heightmap at the regional tile's texel spacing in the tile's units, handing over to the
// tile's slopes across the edge fade, so the landscape and the ground around it are lit as one. The settling
// runs from the rim inward: as soon as the ride starts the outer landscape takes the ground's colour (a radial
// gradient from the lit centre), so its edge matches the planet before the centre lets go; its edge fade, which
// falls to the background at home, turns opaque with it so the landscape meets the planet's ground (the same
// colour, the same heights) instead of showing the background through.
// On the homepage intro the ground opens unlit (uLightsIn 0: the fog's colour, so only the contour lines show
// from the map pose) and its light comes on as the camera descends.
#include <fog_pars_fragment>
#include <land_shading>

uniform sampler2D staticLightingMap;
uniform vec3  baseColor;
uniform vec3  ridgeColor;
uniform vec3  lightColor;
uniform vec3  light2Color;
uniform vec2 edgeFade;
uniform float uMorph;
uniform float uRideBlend;
uniform float uLightsIn;
uniform sampler2D heightmap;
uniform float elevation;
uniform float contrast;
uniform float seaLevel;
uniform float uPlaneSize;
uniform float uPatchScale;
uniform float uPatchRelief;
uniform sampler2D uRegion;
uniform float uHasRegion;
uniform vec2 uRegionTexel;
uniform float uRegionUnits;
uniform float uRegionMaxMetres;
uniform float uRegionScale;
uniform float uRegionSlope;
uniform float uMetresPerUnit;
uniform vec3 uLandBase;
uniform vec3 uLandLine;
uniform float uLandTint;
uniform float uLandShade;

varying float vHeight;
varying vec2  vUv;
varying vec3 vWorldPosition;
varying float vPlan;
varying vec2 vTileUv;
varying float vSeaHeight;
varying float vFacing;

float processH(float raw) {
  float h = pow(max(raw, 0.0), contrast);
  return clamp((h - seaLevel) / max(1.0 - seaLevel, 0.0001), 0.0, 1.0);
}

// The landscape's height above the plane at uv, landscape units.
float ownHeight(vec2 uv) {
  return processH(texture2D(heightmap, uv).r) * elevation;
}

// The globe's land colour here on the ride; edge is how far into the edge fade this is.
vec3 rideColor(float edge) {
  // The landscape's slope one tile texel either side, in the tile's units (its east is plane -x, its north -y).
  float step = uRegionUnits * uRegionTexel.x / uPlaneSize;
  float toTile = uPatchRelief / max(uPatchScale, 1e-9) * uMetresPerUnit / uRegionMaxMetres;
  float gain = LAND_SLOPE_GAIN * uRegionScale * uRegionSlope;
  vec2 slope = vec2(
    ownHeight(vUv - vec2(step, 0.0)) - ownHeight(vUv + vec2(step, 0.0)),
    ownHeight(vUv - vec2(0.0, step)) - ownHeight(vUv + vec2(0.0, step))) * toTile * gain;
  if (uHasRegion > 0.5) slope = mix(slope, landSlope(uRegion, vTileUv, uRegionTexel, gain, 1.0), edge);
  return landColor(uLandBase, vFacing, uLandLine, uLandTint, uLandShade, vSeaHeight, slope);
}

void main() {
  // The fade follows the landscape's own plan distance, so it rides along onto the globe; what it has hidden
  // leaves no depth behind, so the globe shows through there, and what it has only thinned the globe shows
  // through by this alpha.
  float edge = smoothstep(edgeFade.x, edgeFade.y, vPlan);
  float edgeOpacity = 1.0 - edge;
  if (edgeOpacity < 0.004) discard;

  float heightBlend = pow(vHeight, 1.4);
  vec3 color = mix(baseColor, ridgeColor, heightBlend);
  vec2 staticLighting = texture2D(staticLightingMap, vUv).rg;
  color *= lightColor * staticLighting.r + light2Color * staticLighting.g;
  color = mix(fogColor, color, uLightsIn);
  float settle = max(uRideBlend, smoothstep(0.0, edgeFade.x, vPlan) * smoothstep(0.0, 0.04, uMorph));
  if (settle > 0.0) color = mix(color, rideColor(edge), settle);

  // The fade stays on the ride: the globe draws the planet's ground through it (globe.frag composites the cache
  // over itself where the terrain is translucent), so the rim, which stands a little off the planet's coarse
  // surface, never ends in a visible edge. Stored straight (no blending) so the cache keeps this alpha.
  gl_FragColor = vec4(color, edgeOpacity);
  #include <fog_fragment>
}
