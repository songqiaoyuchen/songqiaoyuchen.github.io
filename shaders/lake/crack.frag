// Sonar imaging of the crack's walls. The water is black; a ping's front travels out from where it was sent and
// the walls light as it passes them, by how squarely they face it, with the depth lines drawn on them in gold
// and the front itself in cyan; what the front has passed decays to an afterimage, and the return weakens with
// distance. Up to MAX_PINGS pings overlap.
#define MAX_PINGS 6

uniform float uTime;
uniform vec4 uPings[MAX_PINGS]; // xyz: where it was sent; w: when
uniform int uPingCount;
uniform float uPingSpeed; // units per second
uniform float uPingDecay; // seconds the passed light takes to fade
uniform float uPingRange; // units over which the return weakens
uniform float uDepthLines; // units between the depth lines
uniform float uAmbient;
uniform float uAmbientReach; // units within which the resting light shows
uniform float uFade; // the whole image, 0..1
uniform vec3 uGold;
uniform vec3 uCyan;

uniform float uRockBump; // how much the rock's grain tilts the normal

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying float vAlong;

float hash3(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(hash3(i), hash3(i + vec3(1.0, 0.0, 0.0)), f.x),
    mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y);
  float b = mix(mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x),
    mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y);
  return mix(a, b, f.z);
}

// The rock's grain: broad variation and beds lying level.
float rock(vec3 p) {
  return noise3(p * 0.45) * 0.55 + noise3(vec3(p.x * 0.25, p.y * 1.6, p.z * 0.25) + 3.0) * 0.45;
}

void main() {
  vec3 normal = normalize(vWorldNormal);
  vec3 toCamera = cameraPosition - vWorldPosition;
  float viewDistance = length(toCamera);
  toCamera /= viewDistance;
  // The grain is for rock close by (further off it would only shimmer), so only rock close by pays for it.
  float nearness = exp(-viewDistance / 9.0);
  float grain = 1.0;
  if (nearness > 0.04) {
    vec3 p = vWorldPosition;
    float e = 0.25;
    float r0 = rock(p);
    vec3 slope = vec3(rock(p + vec3(e, 0.0, 0.0)) - r0, rock(p + vec3(0.0, e, 0.0)) - r0,
      rock(p + vec3(0.0, 0.0, e)) - r0) / e;
    slope -= normal * dot(slope, normal);
    normal = normalize(normal - uRockBump * nearness * slope);
    grain = 1.0 - nearness * (0.14 - 0.28 * r0);
  }

  // The depth lines: thin, evenly spaced on world height, a touch wider close up.
  float depthCoord = vWorldPosition.y / uDepthLines;
  float lineWidth = max(fwidth(depthCoord) * 1.1, 0.012);
  float line = 1.0 - smoothstep(0.0, lineWidth * 1.5, abs(fract(depthCoord + 0.5) - 0.5));

  float lit = 0.0; // the walls' light from the pings that have passed
  float front = 0.0; // the fronts themselves
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
    float facing = max(dot(normal, -fromPing / max(d, 1e-3)), 0.0);
    float response = (0.18 + 0.82 * facing) * exp(-d / uPingRange) * (0.3 + 0.7 * smoothstep(0.0, 4.0, d));
    float fade = exp(-behind / (uPingSpeed * uPingDecay));
    // A flash just behind the front, which is the brightest moment of each wall.
    float flash = exp(-behind / 1.5);
    lit += response * fade * (0.06 + 1.1 * flash);
    // The front: a thin band at the reach itself.
    front += exp(-behind / 0.45) * (0.35 + 0.65 * facing) * exp(-d / (uPingRange * 1.6));
  }
  lit = min(lit * grain, 1.25);

  // Soft shading: mostly the return itself, a little more at a glancing angle, as a sonar image's edges do.
  float glance = pow(1.0 - max(dot(normal, toCamera), 0.0), 1.5);
  float shade = lit * (0.3 + 0.3 * glance);
  vec3 color = uGold * (shade * 0.55 + line * lit * 0.95) + uCyan * front * (0.8 + 0.6 * line);
  // The resting light: surfaces close by, faintly, their depth lines a touch clearer; nothing further off.
  float near = uAmbient * exp(-viewDistance / uAmbientReach);
  color += uGold * near * (0.4 + 0.6 * glance + 1.5 * line);
  // Far walls sink into the water.
  color *= exp(-viewDistance / 34.0);
  gl_FragColor = vec4(color * uFade, 1.0);
}
