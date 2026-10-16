// The open location's zoom: a small location magnified on a globe that keeps its size. The surface flows away from the
// location by a conformal zoom of the sphere (stereographic about uLensCenter: tan(drawn / 2) = uLensZoom * tan(angle / 2)),
// so every place keeps its bearing and its shape; the scale is the zoom at the location and falls off smoothly across
// the globe, with no edge anywhere. A zoom of 1 is none. The same maths as lib/scene/placesLens.ts, which places the
// markers. Registered as <places_lens> by lib/scene/placesLensChunk.ts.
uniform vec3 uLensCenter; // unit direction, globe local
uniform float uLensZoom;
uniform float uLensRelief; // heights follow the ground's scale to this power

// Angle from the zoom's centre, precise near it (acos is not).
float lensAngle(vec3 direction) {
  return atan(length(cross(uLensCenter, direction)), dot(uLensCenter, direction));
}

// A direction moved along its bearing from the centre to `angle`.
vec3 lensAt(vec3 direction, float angle) {
  vec3 side = direction - uLensCenter * dot(direction, uLensCenter);
  float length2 = dot(side, side);
  if (length2 < 1e-14) return direction;
  return uLensCenter * cos(angle) + side * inversesqrt(length2) * sin(angle);
}

// Where a place on the globe is drawn.
vec3 lensWarp(vec3 direction) {
  if (uLensZoom <= 1.0001) return direction;
  return lensAt(direction, 2.0 * atan(uLensZoom * tan(min(0.5 * lensAngle(direction), 1.5707))));
}

// The place drawn at a direction: the inverse of lensWarp.
vec3 lensSource(vec3 direction) {
  if (uLensZoom <= 1.0001) return direction;
  return lensAt(direction, 2.0 * atan(tan(min(0.5 * lensAngle(direction), 1.5707)) / uLensZoom));
}

// Relief gain at a drawn direction: magnified ground rises, ground drawn smaller flattens, with its scale there.
float lensRelief(vec3 drawn) {
  if (uLensZoom <= 1.0001) return 1.0;
  float t = tan(min(0.5 * lensAngle(drawn), 1.5707)) / uLensZoom;
  float scale = uLensZoom * (1.0 + t * t) / (1.0 + uLensZoom * uLensZoom * t * t);
  return pow(scale, uLensRelief);
}

// The elevation map's coordinate of a direction (longitude 0 toward +Z, east toward +X), and how far the zoom moves
// the map under a drawn direction: added to the plain coordinate, so the map's seam never crosses a triangle.
vec2 lensMapUv(vec3 direction) {
  return vec2(atan(direction.x, direction.z) / 6.28318530718, asin(clamp(direction.y, -1.0, 1.0)) / 3.14159265359);
}

vec2 lensMapShift(vec3 drawn) {
  if (uLensZoom <= 1.0001) return vec2(0.0);
  vec2 shift = lensMapUv(lensSource(drawn)) - lensMapUv(drawn);
  shift.x -= floor(shift.x + 0.5);
  return shift;
}
