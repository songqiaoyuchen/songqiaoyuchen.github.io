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
// the detail one screen pixel covers, its hillshade scaled to the map's units, fading into the map far out.
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
    vec2 mapUv = vMapUv + lensMapShift(normalize(vLocal));
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
    }
  }
  // Where the lens squeezes the ground, its hillshade flattens with its heights.
  slope *= min(lensRelief(normalize(vLocal)), 1.0);
  vec3 color = landColor(uBaseColor, facing, uLineColor, mix(uLandTint, uFocusTint, uFocus),
    mix(uShade, uFocusShade, uFocus), height, slope);
  color += uRimColor * rim * uRimIntensity;
  // Fog by the fragment's own depth, as the terrain is fogged: interpolated from the planet's vertices it would be
  // the depth of ground kilometres away, fogging the ground beside the landscape to black and showing its rim.
  float fogDepth = -(viewMatrix * vec4(vWorldPosition, 1.0)).z;
  color = mix(color, uFogColor, smoothstep(uFogRange.x, uFogRange.y, fogDepth) * uFogWeight);
  color = mix(color, terrain.rgb, terrain.a);
  gl_FragColor = vec4(color * uVisibility, uVisibility);
}
