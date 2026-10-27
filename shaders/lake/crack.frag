// Sonar imaging of the crack's walls. The water is black; a ping's front travels out from where it was sent and
// the walls light as it passes them, by how squarely they face it, with the depth lines drawn on them in gold
// and the front itself in cyan; what the front has passed decays to an afterimage, and the return weakens with
// distance. Up to MAX_PINGS pings overlap. The rock's fine surface comes from a scanned cliff (uRock: normal in
// rg, height in b, occlusion in a), laid on the walls triplanar at two scales.
#define MAX_PINGS 6

uniform float uTime;
uniform vec4 uPings[MAX_PINGS]; // xyz: where it was sent; w: when
uniform int uPingCount;
uniform float uPingSpeed; // units per second
uniform float uPingDecay; // seconds the passed light takes to fade
uniform float uPingRange; // units over which the return weakens
uniform float uFloorRange; // share of that for the seafloor, which shows only close by
uniform float uDepthLines; // units between the depth lines
uniform float uAmbient;
uniform float uAmbientReach; // units within which the resting light shows
uniform float uFade; // the whole image, 0..1
uniform vec3 uGold;
uniform vec3 uCyan;

uniform sampler2D uRock;
uniform float uRockReady;
uniform float uRockScale; // repeats of the map per unit, the broad scale
uniform float uRockDetailScale; // the finer scale, for rock close by
uniform float uRockBump; // how much the map's normal tilts the wall's
uniform float uRockOcclusion; // how much the map's crevices hold back the return

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying float vAlong;

// The map on each of the three planes: its coordinates run so that each plane's tangent frame is right-handed
// whichever way the plane faces (the sign flips below), so the map's bumps stand out on both faces of the crack
// rather than sinking in on one of them.
vec2 rockUvX(vec3 p, vec3 n) { return vec2(-p.z * sign(n.x), p.y); }
vec2 rockUvY(vec3 p, vec3 n) { return vec2(p.x, -p.z * sign(n.y)); }
vec2 rockUvZ(vec3 p, vec3 n) { return vec2(p.x * sign(n.z), p.y); }

vec3 rockNormal(vec4 packed) {
  return vec3(packed.rg * 2.0 - 1.0, 1.0);
}

void main() {
  vec3 normal = normalize(vWorldNormal);
  vec3 toCamera = cameraPosition - vWorldPosition;
  float viewDistance = length(toCamera);
  toCamera /= viewDistance;
  float nearness = exp(-viewDistance / 9.0);

  // The scanned rock, triplanar: the broad scale everywhere, the fine scale only close by (further off it would
  // only shimmer, so only rock close by pays for it). Each plane's normal is bent toward the wall's own before the
  // planes blend (the whiteout blend), so the seams between planes do not show.
  float occlusion = 1.0;
  if (uRockReady > 0.5) {
    vec3 p = vWorldPosition;
    vec3 blend = pow(abs(normal), vec3(4.0));
    blend /= blend.x + blend.y + blend.z;
    vec2 ux = rockUvX(p, normal), uy = rockUvY(p, normal), uz = rockUvZ(p, normal);
    vec4 sx = texture2D(uRock, ux * uRockScale);
    vec4 sy = texture2D(uRock, uy * uRockScale);
    vec4 sz = texture2D(uRock, uz * uRockScale);
    vec3 tx = rockNormal(sx), ty = rockNormal(sy), tz = rockNormal(sz);
    if (nearness > 0.04) {
      // The fine scale is read a touch sharper than its mip level, as rock close by is seen at a slant.
      float fine = nearness;
      tx.xy += rockNormal(texture2D(uRock, ux * uRockDetailScale, -0.75)).xy * fine;
      ty.xy += rockNormal(texture2D(uRock, uy * uRockDetailScale, -0.75)).xy * fine;
      tz.xy += rockNormal(texture2D(uRock, uz * uRockDetailScale, -0.75)).xy * fine;
    }
    tx.xy *= uRockBump * vec2(-sign(normal.x), 1.0);
    ty.xy *= uRockBump * vec2(1.0, -sign(normal.y));
    tz.xy *= uRockBump * vec2(sign(normal.z), 1.0);
    tx = vec3(tx.xy + normal.zy, abs(tx.z) * normal.x);
    ty = vec3(ty.xy + normal.xz, abs(ty.z) * normal.y);
    tz = vec3(tz.xy + normal.xy, abs(tz.z) * normal.z);
    normal = normalize(tx.zyx * blend.x + ty.xzy * blend.y + tz.xyz * blend.z);
    // Crevices return less than crests: the map's occlusion, and its height about its mean.
    float ao = sx.a * blend.x + sy.a * blend.y + sz.a * blend.z;
    float height = sx.b * blend.x + sy.b * blend.y + sz.b * blend.z;
    occlusion = (1.0 - uRockOcclusion * (1.0 - ao)) * (1.0 + uRockOcclusion * (height - 0.6));
  }

  // The depth lines: thin, evenly spaced on world height, a touch wider close up.
  float depthCoord = vWorldPosition.y / uDepthLines;
  float lineWidth = max(fwidth(depthCoord) * 1.1, 0.012);
  float line = 1.0 - smoothstep(0.0, lineWidth * 1.5, abs(fract(depthCoord + 0.5) - 0.5));

  // The seafloor returns over a short range only: a scan in the basin shows a stretch of it, then the void.
  float floorness = smoothstep(0.35, 0.75, normal.y);
  float range = uPingRange * mix(1.0, uFloorRange, floorness);
  float lit = 0.0; // the walls' light from the pings that have passed
  float front = 0.0; // the fronts themselves
  float lineGlow = 0.0; // the depth lines: lit as a front crosses them, gone again soon after
  for (int i = 0; i < MAX_PINGS; i++) {
    if (i >= uPingCount) break;
    vec4 ping = uPings[i];
    float age = uTime - ping.w;
    if (age < 0.0) continue;
    vec3 fromPing = vWorldPosition - ping.xyz;
    float d = length(fromPing);
    float reach = age * uPingSpeed;
    float behind = reach - d;
    if (behind < 0.0) continue;
    // The return: strongest where the wall faces the ping, weaker with distance, fading after the front has passed.
    // Walls right against the craft are held back, so a ping never whites out the screen.
    // Rock facing the ping squarely returns it hardest, so the bumps and ledges stand out in the image.
    float facing = max(dot(normal, -fromPing / max(d, 1e-3)), 0.0);
    float square = facing * facing * facing * facing;
    float response = (0.18 + 0.62 * facing + 0.45 * square) * exp(-d / range)
      * (0.3 + 0.7 * smoothstep(0.0, 4.0, d));
    float fade = exp(-behind / (uPingSpeed * uPingDecay));
    // A flash just behind the front, which is the brightest moment of each wall.
    float flash = exp(-behind / 1.5);
    lit += response * fade * (0.06 + 1.1 * flash);
    // The front: a thin band at the reach itself.
    front += exp(-behind / 0.45) * (0.35 + 0.65 * facing) * exp(-d / (range * 1.6));
    // The depth lines flare in the front's wake and fade within the second, whatever the walls keep showing.
    lineGlow += exp(-behind / 1.1) * exp(-d / (range * 1.3));
  }
  lit = min(lit * occlusion, 1.25);

  // Soft shading: mostly the return itself, a little more at a glancing angle, as a sonar image's edges do.
  float glance = pow(1.0 - max(dot(normal, toCamera), 0.0), 1.5);
  float shade = lit * (0.3 + 0.3 * glance);
  vec3 color = uGold * (shade * 0.55 + line * lineGlow * 2.4) + uCyan * front * (0.8 + 0.6 * line);
  // The resting light: surfaces close by, faintly; nothing further off, and no depth lines (the sonar's alone).
  float near = uAmbient * exp(-viewDistance / uAmbientReach) * occlusion;
  color += uGold * near * (0.4 + 0.6 * glance);
  // Far walls sink into the water.
  color *= exp(-viewDistance / 34.0);
  gl_FragColor = vec4(color * uFade, 1.0);
}
