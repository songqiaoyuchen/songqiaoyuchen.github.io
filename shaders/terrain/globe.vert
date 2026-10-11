// Travel globe shell: stands the surface off the sphere by the elevation map (relief) and passes what the
// fragment shader needs: the map coordinate, height, world normal and position. SphereGeometry's u runs from longitude -90° eastward, the equirectangular map from
// -180°, hence the quarter turn; the map texture repeats horizontally. Inside the regional ground's footprint
// the finer regional tile supplies the height instead (its colour weight is globe.frag's own, per fragment: this
// sphere's vertices are too sparse across the tile to carry it). With a trip open (uFocus) the height eases to the
// elevation summary, the map's broad forms, and the regional tile gives way to it.
uniform sampler2D uElevation;
uniform float uHasElevation;
uniform float uRelief;
uniform float uRadius;
uniform sampler2D uRegion;
uniform float uHasRegion;
uniform vec3 uRegionAnchor; // unit direction (globe local) of the tile's centre
uniform vec3 uRegionEast;
uniform vec3 uRegionNorth;
uniform float uRegionHalfAngle; // radians, half the tile's width on the planet
uniform float uRegionScale; // the tile's metres at 255 over the elevation map's
uniform sampler2D uSummary;
uniform float uFocus;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vMapUv;
varying float vHeight;
varying vec3 vLocal;
varying vec2 vRegionUv;
varying float vRegionWeight;
varying float vRegionInside; // 1 on the tile's hemisphere

void main() {
  vec3 outward = normalize(position);
  vLocal = outward;
  vMapUv = vec2(uv.x + 0.25, uv.y);
  float height = uHasElevation > 0.5
    ? mix(texture2D(uElevation, vMapUv).r, texture2D(uSummary, vMapUv).r, uFocus) : 0.0;
  // The regional tile: angular offsets from its centre along its east and north, as a share of its half-width.
  vec2 offset = vec2(dot(outward, uRegionEast), dot(outward, uRegionNorth)) / uRegionHalfAngle;
  vRegionUv = 0.5 + offset * 0.5;
  float inside = step(0.0, dot(outward, uRegionAnchor)) * uHasRegion * (1.0 - uFocus);
  vRegionInside = inside;
  vRegionWeight = inside * (1.0 - smoothstep(0.35, 1.0, length(offset)));
  if (vRegionWeight > 0.0) {
    height = mix(height, texture2D(uRegion, vRegionUv).r * uRegionScale, vRegionWeight);
  }
  vHeight = height;
  vec3 displaced = position + outward * (height * uRelief * uRadius);
  vNormal = normalize(mat3(modelMatrix) * outward);
  vec4 world = modelMatrix * vec4(displaced, 1.0);
  vWorldPosition = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
