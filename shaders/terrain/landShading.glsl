// Land colour shared by the terrain on its way to Travel (terrain.frag), the regional ground (region.frag) and the
// globe (globe.frag), so the three surfaces are one: the dark ground; land a shade lighter and warmer with
// height; hillshade lit from the map's north-west. Heights are in the elevation map's units (1 at its top,
// TRAVEL_CONFIG.elevationTopMetres); slopes are the map's (east - west, north - south) over a texel pair, scaled.
// Registered as <land_shading> by lib/scene/landShading.ts.
const float LAND_SEA = 0.002;
const float LAND_SLOPE_GAIN = 48.0;

// Slope of a height map at uv: (east - west, north - south) in map units, times scale, read spread texels either
// side from the matching mip level (a spread of 1 is the map's own texel; wider reads it as a coarser map would,
// which is how the regional tile softens into the global map toward its edge).
vec2 landSlope(sampler2D map, vec2 uv, vec2 texel, float scale, float spread) {
  float bias = log2(max(spread, 1.0));
  vec2 step = texel * spread;
  float east = texture2D(map, uv + vec2(step.x, 0.0), bias).r;
  float west = texture2D(map, uv - vec2(step.x, 0.0), bias).r;
  float north = texture2D(map, uv + vec2(0.0, step.y), bias).r;
  float south = texture2D(map, uv - vec2(0.0, step.y), bias).r;
  return vec2(east - west, north - south) * scale;
}

// How many of the regional tile's texels one read spans at a share of its half-width from its centre: its own
// texel in the middle, the global map's (spreadMax tile texels) by the edge, where the globe has handed over to
// the map (globe.frag).
float landSpread(float share, float spreadMax) {
  return mix(1.0, spreadMax, smoothstep(0.35, 1.0, share));
}

// The ground colour at a height above sea with a slope, in the globe's colours, the ground darkening as the planet
// turns away from the camera (facing); sea is the ground, a little darker.
vec3 landColor(vec3 base, float facing, vec3 line, float tint, float shadeGain, float height, vec2 slope) {
  vec3 ground = base * (0.7 + 0.3 * facing);
  float shade = clamp(1.0 + shadeGain * (slope.y - slope.x) * 0.5, 0.35, 1.8);
  vec3 land = ground + line * tint * (0.35 + height);
  return height > LAND_SEA ? land * shade : ground * 0.85;
}
