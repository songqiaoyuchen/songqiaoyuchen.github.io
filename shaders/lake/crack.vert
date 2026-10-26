// The crack's walls: world position and normal for the sonar in crack.frag.
attribute float along;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying float vAlong;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPosition = world.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vAlong = along;
  gl_Position = projectionMatrix * viewMatrix * world;
}
