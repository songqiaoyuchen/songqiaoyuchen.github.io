uniform sampler2D uTexture;
uniform sampler2D uTerrainDepth;
uniform mat4 uClipToWorld;
uniform mat4 uClipToView;
uniform vec2 uRevealFog;
// World-space base elevation and height span up to the terrain's peak.
uniform vec2 uTerrainHeight;
uniform sampler2D uOil;
uniform sampler2D uPencil;
uniform vec2 uResolution;
uniform vec3 uDigitalAccent;
uniform vec3 uRevealColor;
uniform float uRevealIntensity;
uniform float uRevealRadius;
uniform vec3 uBackground;
uniform float uFrom;
uniform float uTo;
uniform float uProgress;
uniform float uArtOpacity;
uniform mat3 uScreenToImage;
uniform float uCaptureSource;
uniform vec3 uCaptureAdjust;
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
  float background = dot(uBackground, vec3(.2126, .7152, .0722));
  // Lift faint lighting continuously without assigning uniform dots to shadow
  // or fully fogged terrain. Zero contrast against the background stays empty.
  float tone = pow(1.0 - exp(-max(0.0, illumination - background) * 16.0), .8);
  float depth = texture2D(uTerrainDepth, sampleUv).r;
  float terrain = 1.0 - step(1.0, depth);
  float radius = .42 * sqrt(tone);
  float distanceToCenter = length(fract(vUv * grid) - .5);
  float aa = max(fwidth(distanceToCenter), .015);
  float dotShape = (1.0 - smoothstep(radius - aa, radius + aa, distanceToCenter)) * terrain;
  // Fade subpixel dots to zero instead of leaving antialiasing residue at zero radius.
  dotShape *= smoothstep(0.0, .025, tone);
  dotShape *= 1.0 - step(1.0, texture2D(uTerrainDepth, vUv).r);

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

float replacementMask(out float glow) {
  glow = 0.0;
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
  // Share the reveal's elevation boundary so the light hugs every ridge.
  float distanceToFront = abs(arrival - front);
  // Use the Home major ring's world-space radius, with pixel antialiasing.
  float coreWidth = uRevealRadius / uTerrainHeight.y;
  float aa = max(fwidth(arrival), .0001);
  float core = 1.0 - smoothstep(max(0.0, coreWidth - aa), coreWidth + aa, distanceToFront);
  float halo = 1.0 - smoothstep(0.0, (coreWidth + aa) * 4.0, distanceToFront);
  float fade = smoothstep(0.0, .04, uProgress) * (1.0 - smoothstep(.96, 1.0, uProgress));
  vec4 view = uClipToView * vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  float visibility = 1.0 - smoothstep(uRevealFog.x, max(uRevealFog.x + .0001, uRevealFog.y), -view.z / view.w);
  // Fade by distance, not surface lighting: local shadows must not cut the ring.
  // Home rings attenuate both their additive color and alpha with distance fog.
  glow = (core + halo * halo * .15) * fade * visibility * visibility * step(.5, abs(uTo - uFrom));
  return 1.0 - smoothstep(front - feather, front + feather, arrival);
}

void main() {
  vec4 original = texture2D(uTexture, vUv);
  if (uCaptureSource >= 0.0) {
    vec3 color = mediumColor(uCaptureSource, original.rgb, imageUv(vUv));
    color *= exp2(uCaptureAdjust.x);
    float luminance = dot(color, vec3(.2126, .7152, .0722));
    color = max(vec3(0.0), mix(vec3(luminance), color, uCaptureAdjust.z));
    color = pow(color / .18, vec3(uCaptureAdjust.y)) * .18;
    gl_FragColor = vec4(color, 1.0);
    return;
  }
  if (uArtOpacity < .0001) {
    gl_FragColor = original;
    return;
  }
  vec2 uv = imageUv(vUv);
  float glow;
  float mask = replacementMask(glow);
  vec3 color;
  // Only evaluate the two styles inside the narrow moving boundary.
  if (mask <= 0.0) color = mediumColor(uFrom, original.rgb, uv);
  else if (mask >= 1.0) color = mediumColor(uTo, original.rgb, uv);
  else color = mix(mediumColor(uFrom, original.rgb, uv), mediumColor(uTo, original.rgb, uv), mask);
  // Match the Home major rings' pale gold and additive light treatment.
  vec3 ring = uRevealColor * uRevealIntensity;
  color += ring * clamp(max(ring.r, max(ring.g, ring.b)), 0.0, 1.0) * glow;
  gl_FragColor = vec4(mix(original.rgb, color, uArtOpacity), original.a);
}
