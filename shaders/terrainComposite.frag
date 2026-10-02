uniform sampler2D uTexture;
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

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

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
  vec2 artUv = imageUv(sampleUv);
  float radius = .42 * sqrt(tone);
  float distanceToCenter = length(fract(vUv * grid) - .5);
  float aa = max(fwidth(distanceToCenter), .015);
  float dotShape = (1.0 - smoothstep(radius - aa, radius + aa, distanceToCenter)) * step(.025, tone);

  // Match the image treatments' camera framing. Finish whole dots at staggered
  // positions just before the midpoint, with no horizontal opacity gradient.
  float end = .435 + .055 * hash(vec2(floor(artUv.y * 48.0), 17.0));
  float drawn = 1.0 - step(end, artUv.x);

  // Remove the far-left secondary shoulder above the main mountain's diagonal
  // silhouette. Authoring-image coordinates keep the cut registered on resize.
  if (artUv.x < .169) {
    float boundary = mix(.654, .602, clamp(artUv.x / .068, 0.0, 1.0));
    boundary = mix(boundary, .543, clamp((artUv.x - .068) / .048, 0.0, 1.0));
    boundary = mix(boundary, .462, clamp((artUv.x - .116) / .022, 0.0, 1.0));
    boundary = mix(boundary, .410, clamp((artUv.x - .138) / .031, 0.0, 1.0));
    float roughness = (hash(vec2(floor(artUv.x * 240.0), 29.0)) - .5) * .006;
    drawn *= step(boundary + roughness, 1.0 - artUv.y);
  }

  // Full-size dot cores retain the actual accent. Brightness is carried by
  // coverage, never by an amber tint or an exposure multiplier on the color.
  return mix(uBackground, uDigitalAccent, dotShape * drawn);
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
  // One top-down edge replaces both styles together, including their backgrounds.
  float column = vUv.x * 35.0;
  float uneven = mix(hash(vec2(floor(column), 3.0)), hash(vec2(floor(column) + 1.0, 3.0)),
    smoothstep(0.0, 1.0, fract(column))) - .5;
  float front = mix(-.035, 1.035, uProgress);
  return 1.0 - smoothstep(front - .012, front + .012, 1.0 - vUv.y + uneven * .025);
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
