// Places globe surface, drawn like a survey map in the terrain's language: the dark ground, land a shade
// lighter and warmer with height, hillshade from the elevation map so ranges and basins read (the shared land
// formula, landShading.glsl), a gold rim where the sphere turns away; coastlines and the graticule are line
// layers above. Opaque, so it hides the far side of the lines on it; where the morphing terrain is nearer it
// yields (terrain depth). While it is still the ground under the landscape it takes the scene fog (uFogWeight),
// which leaves as the globe becomes a globe. Around the landing place it reads the finer regional tile, the ground
// the landscape's edge hands over to on the way; toward the tile's edge the tile is read ever more coarsely, so it
// softens into the map rather than ending. With a location open (uFocus, eased) it becomes a raised-relief map: the
// elevation summary's broad forms in place of the map's detail and the regional tile, hillshaded and tinted by
// height; the coast stays the map's own. The open location's zoom moves the map under each fragment (placesLens.glsl),
// and a zoomed location's own ground (uGround, many times finer, 16-bit) takes over from the map about the location: read at
// the detail one screen pixel covers, its hillshade scaled to the map's units, fading into the map far out. The
// ground's kind layer (uKinds: water, snow and ice, the land's kinds, lake, river and glacier flags; lib/scene/places.ts
// GROUND_KIND) makes it an atlas, still in the night's dark: water an ink blue, snow a cold grey, the land's kinds a
// shade apart under the gold. It develops along the focus journey, water first (uAtlasWaterAmount) then the land
// (uAtlasLandAmount), each from the ground's centre outward (uAtlasSpread), and leaves the same way.
#include <land_shading>
#include <places_lens>

uniform sampler2D uElevation;
uniform float uHasElevation;
uniform vec2 uTexel;
uniform sampler2D uRegion;
uniform vec2 uRegionTexel;
uniform float uRegionScale;
uniform float uRegionSlope; // hillshade gain of the tile relative to the map's
uniform float uRegionSpread; // the tile's texels per global-map texel
uniform vec3 uBaseColor;
uniform vec3 uRimColor;
uniform float uRimIntensity;
uniform vec3 uLineColor;
uniform float uShade;
uniform float uLandTint;
uniform sampler2D uSummary;
uniform float uFocus;
uniform float uFocusShade;
uniform float uFocusTint;
uniform float uVisibility;
uniform sampler2D uTerrainDepth;
uniform sampler2D uTerrainColor; // the terrain cache, fogged, its edge fade as alpha
uniform float uUseTerrainDepth;
uniform vec2 uResolution; // drawing-buffer pixels, for the terrain-depth lookup
uniform vec3 uFogColor;
uniform vec2 uFogRange; // near, far
uniform float uFogWeight;
uniform sampler2D uGround;
uniform float uGroundWeight; // 0 without a ground or a location open
uniform vec3 uGroundAnchor; // unit direction (globe local) of its centre
uniform vec3 uGroundEast;
uniform vec3 uGroundNorth;
uniform float uGroundHalfAngle; // radians, half its width
uniform float uGroundSize; // texels across
uniform float uGroundSpread; // its texels per elevation-map texel
uniform float uGroundShade;
uniform sampler2D uKinds; // the ground's kind, packed: kind in the high four bits, flags in the low three
uniform float uHasKinds;
uniform vec3 uAtlasWater;
uniform vec3 uAtlasSnow;
uniform float uAtlasKindTint;
uniform float uAtlasRiver;
uniform float uAtlasSpread; // half-widths the atlas's front lags its centre
uniform float uAtlasWaterAmount;
uniform float uAtlasLandAmount;

// How far the atlas has reached a place `distance` half-widths from the ground's centre at `amount` of its way:
// its front runs from the centre past the edge, softened over uAtlasSpread (none: everywhere at once).
float atlasReveal(float amount, float distance) {
  if (uAtlasSpread < 1e-4) return amount;
  float front = amount * (1.0 + uAtlasSpread);
  return smoothstep(0.0, 1.0, (front - distance) / uAtlasSpread);
}

// A land kind's colour against the one dark: trees cooler, grass and crops a shade greener, bare ground and moss
// warmer, built-up ground a little lighter; anything else the ground as it is.
vec3 kindFactor(int kind) {
  if (kind == 1) return vec3(0.82, 1.0, 0.92);
  if (kind == 2 || kind == 3 || kind == 4) return vec3(0.96, 1.04, 0.88);
  if (kind == 6 || kind == 10) return vec3(1.12, 1.02, 0.9);
  if (kind == 5) return vec3(1.08, 1.06, 1.02);
  return vec3(1.0);
}

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vMapUv;
varying float vHeight;
varying vec3 vLocal;
varying vec2 vRegionUv;
varying float vRegionInside;

void main() {
  // The cached terrain in front of this ground, with its edge fade as alpha: composited over the ground below,
  // so the landscape's rim, which stands a little off the planet's coarse surface, fades into the ground rather
  // than ending in an edge. Opaque terrain hides the ground outright.
  vec4 terrain = vec4(0.0);
  if (uUseTerrainDepth > 0.5) {
    // From the fragment itself: the planet is so large up close that a screen position interpolated from its
    // vertices lands elsewhere.
    vec2 screen = gl_FragCoord.xy / uResolution;
    if (gl_FragCoord.z > texture2D(uTerrainDepth, screen).r) {
      terrain = texture2D(uTerrainColor, screen);
      if (terrain.a >= 0.999) discard;
    }
  }
  vec3 toCamera = normalize(cameraPosition - vWorldPosition);
  float facing = max(dot(normalize(vNormal), toCamera), 0.0);
  float rim = pow(1.0 - facing, 3.0);

  float height = vHeight;
  vec2 slope = vec2(0.0);
  if (uHasElevation > 0.5) {
    vec2 mapUv = lensMapUvNear(normalize(vLocal), vMapUv);
    height = texture2D(uElevation, mapUv).r;
    slope = landSlope(uElevation, mapUv, uTexel, LAND_SLOPE_GAIN, 1.0);
    // Inside the regional tile (share of its half-width from its centre), the tile alone over its inner half, then
    // handing over to the map by its edge. The tile is many times finer: its slope is scaled to read like the
    // map's, and it is read more coarsely toward its edge.
    float share = length(vRegionUv - 0.5) * 2.0;
    float weight = vRegionInside * (1.0 - smoothstep(0.5, 1.0, share)) * (1.0 - uFocus);
    if (weight > 0.0) {
      float spread = landSpread(share, uRegionSpread);
      height = mix(height, texture2D(uRegion, vRegionUv, log2(spread)).r * uRegionScale, weight);
      slope = mix(slope,
        landSlope(uRegion, vRegionUv, uRegionTexel, LAND_SLOPE_GAIN * uRegionScale * uRegionSlope, spread),
        weight);
    }
    if (uFocus > 0.0) {
      // Land stays land and sea stays sea by the map: the summary spreads the land's heights over the coast.
      float summary = texture2D(uSummary, mapUv).r;
      if (height > LAND_SEA) height = max(mix(height, summary, uFocus), LAND_SEA * 1.5);
      slope = mix(slope, landSlope(uSummary, mapUv, uTexel, LAND_SLOPE_GAIN, 1.0), uFocus);
    }
  }

  // The atlas's parts where the ground's kind is known: how far each has come here, and what it paints.
  float waterHere = 0.0;
  float snowHere = 0.0;
  float riverHere = 0.0;
  vec3 kindTint = vec3(1.0);
  if (uGroundWeight > 0.0) {
    // The place drawn here, as offsets from the ground's centre over its half-width; it hands over to the map from
    // half way out, by its edge entirely.
    vec3 place = lensSource(normalize(vLocal));
    vec2 offset = vec2(dot(place, uGroundEast), dot(place, uGroundNorth)) / uGroundHalfAngle;
    float weight = uGroundWeight * step(0.0, dot(place, uGroundAnchor))
      * (1.0 - smoothstep(0.45, 0.95, length(offset)));
    if (weight > 0.0) {
      vec2 groundUv = 0.5 + offset * 0.5;
      vec2 texels = groundUv * uGroundSize;
      // A step of about two screen pixels: finer reads only add noise.
      float lod = max(0.0, log2(max(length(dFdx(texels)), length(dFdy(texels)))) + 1.0);
      float reach = exp2(lod) / uGroundSize;
      float east = textureLod(uGround, groundUv + vec2(reach, 0.0), lod).r;
      float west = textureLod(uGround, groundUv - vec2(reach, 0.0), lod).r;
      float north = textureLod(uGround, groundUv + vec2(0.0, reach), lod).r;
      float south = textureLod(uGround, groundUv - vec2(0.0, reach), lod).r;
      float groundHeight = textureLod(uGround, groundUv, lod).r;
      // Height differences over a texel pair at this level, as the map's: times the level's texels per map texel.
      vec2 groundSlope = vec2(east - west, north - south) * LAND_SLOPE_GAIN * uGroundShade * uGroundSpread / exp2(lod);
      height = mix(height, groundHeight, weight);
      slope = mix(slope, groundSlope, weight);
      if (uHasKinds > 0.5) {
        // The kind at the same level, read exactly: a texel is one kind, never a blend of two.
        float packed = floor(textureLod(uKinds, groundUv, lod).r * 255.0 + 0.5);
        int kind = int(floor(packed / 16.0));
        float flags = packed - float(kind) * 16.0;
        bool lake = mod(flags, 2.0) >= 1.0;
        bool river = mod(floor(flags / 2.0), 2.0) >= 1.0;
        bool glacier = flags >= 4.0;
        float distance = length(offset);
        float water = atlasReveal(uAtlasWaterAmount, distance) * weight;
        float land = atlasReveal(uAtlasLandAmount, distance) * weight;
        if (kind == 8 || lake) waterHere = water;
        else if (kind == 7 || glacier) snowHere = land;
        else if (kind == 9) waterHere = water * 0.5;
        else if (river) riverHere = water * uAtlasRiver;
        if (kind != 8 && kind != 7 && !lake && !glacier) kindTint = mix(vec3(1.0), kindFactor(kind), land * uAtlasKindTint);
      }
    }
  }
  // Where the lens squeezes the ground, its hillshade flattens with its heights.
  slope *= min(lensRelief(normalize(vLocal)), 1.0);
  vec3 color = landColor(uBaseColor, facing, uLineColor, mix(uLandTint, uFocusTint, uFocus),
    mix(uShade, uFocusShade, uFocus), height, slope) * kindTint;
  // The atlas over the land colour: snow keeps the hillshade, water lies flat with the ground's turn from the camera.
  float shade = clamp(1.0 + mix(uShade, uFocusShade, uFocus) * (slope.y - slope.x) * 0.5, 0.35, 1.8);
  color = mix(color, uAtlasSnow * shade, snowHere);
  color = mix(color, uAtlasWater * (0.7 + 0.3 * facing), max(waterHere, riverHere));
  color += uRimColor * rim * uRimIntensity;
  // Fog by the fragment's own depth, as the terrain is fogged: interpolated from the planet's vertices it would be
  // the depth of ground kilometres away, fogging the ground beside the landscape to black and showing its rim.
  float fogDepth = -(viewMatrix * vec4(vWorldPosition, 1.0)).z;
  color = mix(color, uFogColor, smoothstep(uFogRange.x, uFogRange.y, fogDepth) * uFogWeight);
  color = mix(color, terrain.rgb, terrain.a);
  gl_FragColor = vec4(color * uVisibility, uVisibility);
}
