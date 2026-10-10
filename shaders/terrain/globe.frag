// Travel globe surface, drawn like a survey map in the terrain's language: the dark ground, land a shade
// lighter and warmer with height, hillshade from the elevation map so ranges and basins read (the shared land
// formula, landShading.glsl), a gold rim where the sphere turns away; coastlines and the graticule are line
// layers above. Opaque, so it hides the far side of the lines on it; where the morphing terrain is nearer it
// yields (terrain depth). While it is still the ground under the landscape it takes the scene fog (uFogWeight),
// which leaves as the globe becomes a globe. Around the landing place it reads the finer regional tile, the ground
// the landscape's edge hands over to on the way; toward the tile's edge the tile is read ever more coarsely, so it
// softens into the map rather than ending.
#include <land_shading>

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
uniform float uVisibility;
uniform sampler2D uTerrainDepth;
uniform float uUseTerrainDepth;
uniform vec2 uResolution; // drawing-buffer pixels, for the terrain-depth lookup
uniform vec3 uFogColor;
uniform vec2 uFogRange; // near, far
uniform float uFogWeight;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vMapUv;
varying float vHeight;
varying float vFogDepth;
varying vec3 vLocal;
varying vec2 vRegionUv;
varying float vRegionInside;

void main() {
  if (uUseTerrainDepth > 0.5) {
    // From the fragment itself: the planet is so large up close that a screen position interpolated from its
    // vertices lands elsewhere.
    float terrainDepth = texture2D(uTerrainDepth, gl_FragCoord.xy / uResolution).r;
    if (gl_FragCoord.z > terrainDepth) discard;
  }
  vec3 toCamera = normalize(cameraPosition - vWorldPosition);
  float facing = max(dot(normalize(vNormal), toCamera), 0.0);
  float rim = pow(1.0 - facing, 3.0);

  float height = vHeight;
  vec2 slope = vec2(0.0);
  if (uHasElevation > 0.5) {
    height = texture2D(uElevation, vMapUv).r;
    slope = landSlope(uElevation, vMapUv, uTexel, LAND_SLOPE_GAIN, 1.0);
    // Inside the regional tile (share of its half-width from its centre), the tile alone over its inner half, then
    // handing over to the map by its edge. The tile is many times finer: its slope is scaled to read like the
    // map's, and it is read more coarsely toward its edge.
    float share = length(vRegionUv - 0.5) * 2.0;
    float weight = vRegionInside * (1.0 - smoothstep(0.5, 1.0, share));
    if (weight > 0.0) {
      float spread = landSpread(share, uRegionSpread);
      height = mix(height, texture2D(uRegion, vRegionUv, log2(spread)).r * uRegionScale, weight);
      slope = mix(slope,
        landSlope(uRegion, vRegionUv, uRegionTexel, LAND_SLOPE_GAIN * uRegionScale * uRegionSlope, spread),
        weight);
    }
  }

  vec3 color = landColor(uBaseColor, facing, uLineColor, uLandTint, uShade, height, slope);
  color += uRimColor * rim * uRimIntensity;
  color = mix(color, uFogColor, smoothstep(uFogRange.x, uFogRange.y, vFogDepth) * uFogWeight);
  gl_FragColor = vec4(color * uVisibility, uVisibility);
}
