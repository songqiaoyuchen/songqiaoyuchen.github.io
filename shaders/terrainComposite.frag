uniform sampler2D uTexture;
uniform sampler2D uTerrainDepth;
uniform mat4 uClipToWorld;
// World-space base elevation and height span up to the terrain's peak.
uniform vec2 uTerrainHeight;
uniform sampler2D uOil;
uniform sampler2D uPencil;
uniform vec2 uResolution;
uniform vec3 uDigitalAccent;
uniform vec3 uBackground;
uniform float uFrom;
uniform float uTo;
uniform float uProgress;
uniform float uArtOpacity;
uniform mat3 uScreenToImage;
varying vec2 vUv;

vec2 imageUv(vec2 screenUv) {
  vec3 p = uScreenToImage * vec3(screenUv * 2.0 - 1.0, 1.0);
  return p.xy / p.z * .5 + .5;
}

vec3 digital() {
  // CSS-pixel spacing keeps the same visual weight on high-DPI displays.
  vec2 grid = uResolution / 4.5;
  vec2 cell = floor(vUv * grid);
  vec2 sampleUv = (cell + .5) / grid;
  vec3 sampleColor = texture2D(uTexture, sampleUv).rgb;
  float illumination = dot(sampleColor, vec3(.2126, .7152, .0722));
  float tone = 1.0 - exp(-max(0.0, illumination - .0035) * 16.0);
  float radius = .42 * sqrt(tone);
  float distanceToCenter = length(fract(vUv * grid) - .5);
  float aa = max(fwidth(distanceToCenter), .015);
  float dotShape = (1.0 - smoothstep(radius - aa, radius + aa, distanceToCenter)) * step(.025, tone);

  // Full-size dot cores retain the actual accent. Brightness is carried by
  // coverage, never by an amber tint or an exposure multiplier on the color.
  return mix(uBackground, uDigitalAccent, dotShape);
}

vec3 mediumColor(float medium, vec3 original, vec2 uv) {
  if (medium < .5) return original;
  if (medium > 2.5) return digital();
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return original;
  vec3 color = medium < 1.5 ? texture2D(uOil, uv).rgb : texture2D(uPencil, uv).rgb;
  float edge = smoothstep(0.0, .015, min(uv.x, 1.0 - uv.x));
  return mix(original, color, edge);
}

float replacementMask() {
  if (uProgress <= 0.0) return 0.0;
  if (uProgress >= 1.0) return 1.0;
  float depth = texture2D(uTerrainDepth, vUv).r;
  // Open sky has no surface to follow; blend it without a moving screen edge.
  if (depth >= 1.0) return smoothstep(0.0, .2, uProgress);

  vec4 world = uClipToWorld * vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  float height = clamp((world.y / world.w - uTerrainHeight.x) / uTerrainHeight.y, 0.0, 1.0);
  // Descend from peaks to valleys along actual elevation contours. The same
  // surface mask replaces both media, including the painted image treatments.
  float arrival = 1.0 - height;
  float feather = max(.012, fwidth(arrival));
  float front = mix(-.035, 1.035, uProgress);
  return 1.0 - smoothstep(front - feather, front + feather, arrival);
}

void main() {
  vec4 original = texture2D(uTexture, vUv);
  if (uArtOpacity < .0001) {
    gl_FragColor = original;
    return;
  }
  vec2 uv = imageUv(vUv);
  float mask = replacementMask();
  vec3 color;
  // Only evaluate the two styles inside the narrow moving boundary.
  if (mask <= 0.0) color = mediumColor(uFrom, original.rgb, uv);
  else if (mask >= 1.0) color = mediumColor(uTo, original.rgb, uv);
  else color = mix(mediumColor(uFrom, original.rgb, uv), mediumColor(uTo, original.rgb, uv), mask);
  gl_FragColor = vec4(mix(original.rgb, color, uArtOpacity), original.a);
}
