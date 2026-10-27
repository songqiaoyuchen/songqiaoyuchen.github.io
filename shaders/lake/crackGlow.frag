// The crack's walls as the bloom pass sees them: only what glows (each ping's front and the depth lines flaring
// in its wake), with none of the rock's grain or shading, so the second draw of the walls costs a fraction of the
// first.
#define MAX_PINGS 6

uniform float uTime;
uniform vec4 uPings[MAX_PINGS];
uniform int uPingCount;
uniform float uPingSpeed;
uniform float uPingDecay;
uniform float uPingRange;
uniform float uFloorRange;
uniform float uDepthLines;
uniform float uFade;
uniform vec3 uGold;
uniform vec3 uCyan;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

void main() {
  vec3 normal = normalize(vWorldNormal);
  float viewDistance = distance(cameraPosition, vWorldPosition);
  float depthCoord = vWorldPosition.y / uDepthLines;
  float lineWidth = max(fwidth(depthCoord) * 1.1, 0.012);
  float line = 1.0 - smoothstep(0.0, lineWidth * 1.5, abs(fract(depthCoord + 0.5) - 0.5));

  float range = uPingRange * mix(1.0, uFloorRange, smoothstep(0.35, 0.75, normal.y));
  float lit = 0.0;
  float front = 0.0;
  float lineGlow = 0.0;
  for (int i = 0; i < MAX_PINGS; i++) {
    if (i >= uPingCount) break;
    vec4 ping = uPings[i];
    float age = uTime - ping.w;
    if (age < 0.0) continue;
    vec3 fromPing = vWorldPosition - ping.xyz;
    float d = length(fromPing);
    float behind = age * uPingSpeed - d;
    if (behind < 0.0) continue;
    float facing = max(dot(normal, -fromPing / max(d, 1e-3)), 0.0);
    float response = (0.18 + 0.82 * facing) * exp(-d / range) * (0.3 + 0.7 * smoothstep(0.0, 4.0, d));
    float fade = exp(-behind / (uPingSpeed * uPingDecay));
    lit += response * fade * (0.06 + 1.1 * exp(-behind / 1.5));
    front += exp(-behind / 0.45) * (0.35 + 0.65 * facing) * exp(-d / (range * 1.6));
    lineGlow += exp(-behind / 1.1) * exp(-d / (range * 1.3));
  }
  lit = min(lit, 1.25);
  vec3 color = uGold * (lit * 0.17 + line * lineGlow * 3.0) + uCyan * front * (0.8 + 0.6 * line);
  color *= exp(-viewDistance / 34.0);
  gl_FragColor = vec4(color * uFade, 1.0);
}
