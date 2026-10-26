// The crack's walls: world position and normal for the sonar in crack.frag. The scanned rock's height map
// (uRock.b, sampled triplanar) pushes each vertex in or out a little along its normal, so the fine relief is in
// the silhouette too, not only in the shading; the craft's clearance from the wall is more than that push. The
// push is for rock close by: further off it would only serrate the silhouettes, so it fades with distance.
uniform sampler2D uRock;
uniform float uRockReady; // 1 once the map has loaded, 0 before: flat walls until then
uniform float uRockScale; // repeats of the map per unit
uniform float uRockRelief; // units the height map pushes a vertex, at most

attribute float along;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying float vAlong;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
  vec3 blend = pow(abs(worldNormal), vec3(4.0));
  blend /= blend.x + blend.y + blend.z;
  // A coarse level of the map (a texel about the vertex spacing): finer relief than the vertices can carry would
  // only jitter them, and the silhouettes with them.
  // The same plane coordinates as crack.frag reads the map by, so the push and the shading agree.
  vec3 p = world.xyz, n = worldNormal;
  float height = textureLod(uRock, vec2(-p.z * sign(n.x), p.y) * uRockScale, 4.0).b * blend.x
    + textureLod(uRock, vec2(p.x, -p.z * sign(n.y)) * uRockScale, 4.0).b * blend.y
    + textureLod(uRock, vec2(p.x * sign(n.z), p.y) * uRockScale, 4.0).b * blend.z;
  float nearness = exp(-distance(cameraPosition, world.xyz) / 5.0);
  world.xyz += worldNormal * ((height - 0.6) * uRockRelief * uRockReady * nearness);
  vWorldPosition = world.xyz;
  vWorldNormal = worldNormal;
  vAlong = along;
  gl_Position = projectionMatrix * viewMatrix * world;
}
