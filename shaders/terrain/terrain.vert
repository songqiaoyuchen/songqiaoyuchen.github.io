// Terrain surface: displaces the plane by the baked heightmap (rendered only into the CachedTerrain cache).
// On the way to Places (uMorph 0 -> 1) the plane rides on the planet: each vertex is wrapped onto the sphere about
// the pivot (the terrain point that lands on the planet's anchor), standing above sea level by its own height plus
// the landing place's elevation, at the arc scale PlacesGlobe publishes for the frame. Toward its edge the
// landscape takes the regional tile's heights (the globe draws that ground beneath), so the two meet; its
// place on that tile and its height above sea go to terrain.frag for the ride's land shading.
#include <fog_pars_vertex>

uniform sampler2D heightmap;
uniform float elevation;
uniform float contrast;
uniform float seaLevel;
uniform vec2 edgeFade;
uniform float uMorph;
uniform vec3 uGlobeCenter;
uniform float uGlobeRadius;
uniform vec3 uPatchAnchor; // unit direction from the centre to where the pivot lands
uniform vec3 uPatchEast;
uniform vec3 uPatchNorth;
uniform vec2 uPatchPivot; // plane-local point that lands on the anchor
uniform float uPatchScale; // world units of arc on the planet per landscape unit, this frame
uniform float uPatchRelief; // height factor on the planet, this frame
uniform float uSeaUnits; // the landing place's elevation, landscape units
uniform float uDatumY; // the terrain surface's world y at the pivot
uniform sampler2D uRegion;
uniform float uHasRegion;
uniform float uRegionUnits;
uniform float uRegionMaxMetres;
uniform float uRegionScale; // the tile's metres at 255 over the elevation map's
uniform float uMetresPerUnit;

varying float vHeight;
varying vec2  vUv;
varying vec3 vWorldPosition;
varying float vPlan; // plan distance from the plane's centre in the landscape, for the edge fade
varying vec2 vTileUv; // where this lands on the regional tile
varying float vSeaHeight; // height above sea on the ride, in the elevation map's units
varying float vFacing; // how squarely the planet's surface here faces the camera, on the ride

float processH(float raw) {
  float h = pow(max(raw, 0.0), contrast);
  return clamp((h - seaLevel) / max(1.0 - seaLevel, 0.0001), 0.0, 1.0);
}

void main() {
  vUv = uv;

  float h = processH(texture2D(heightmap, uv).r);
  vHeight = h;

  vec3 pos = position;
  pos.z += h * elevation;
  vec3 world = (modelMatrix * vec4(pos, 1.0)).xyz;
  vPlan = length(world.xz);
  vTileUv = vec2(0.5);
  vSeaHeight = 0.0;
  vFacing = 1.0;

  if (uMorph > 0.0) {
    // Plan offsets from the pivot follow the planet's tangent frame (plane x is world x, plane y is world -z, so
    // both flip onto east/north).
    vec2 local = position.xy - uPatchPivot;
    vec3 tangent = uPatchAnchor * uGlobeRadius - (uPatchEast * local.x + uPatchNorth * local.y) * uPatchScale;
    vec3 direction = normalize(tangent);
    // Height above sea: the landscape's own, handing over to the regional ground across the edge fade.
    float seaUnits = (world.y - uDatumY) * uPatchRelief / max(uPatchScale, 1e-9) + uSeaUnits;
    vTileUv = vec2(0.5 - local.x / uRegionUnits, 0.5 - local.y / uRegionUnits);
    if (uHasRegion > 0.5) {
      float regionSea = texture2D(uRegion, vTileUv).r * uRegionMaxMetres / uMetresPerUnit;
      seaUnits = mix(seaUnits, regionSea, smoothstep(edgeFade.x, edgeFade.y, vPlan));
    }
    vSeaHeight = seaUnits * uMetresPerUnit / uRegionMaxMetres * uRegionScale;
    vec3 onGlobe = uGlobeCenter + direction * (uGlobeRadius + seaUnits * uPatchScale);
    world = mix(world, onGlobe, smoothstep(0.0, 0.05, uMorph));
    vFacing = max(dot(direction, normalize(cameraPosition - world)), 0.0);
  }
  vWorldPosition = world;

  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  #include <fog_vertex>
}
