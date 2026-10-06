// Full-screen compositor (CachedTerrain): cached terrain plus oil/pencil/digital backdrops, the contour wipe
// between them, flight fog, Art cursor effects and Screenshot-mode adjustments.
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
// Oil's smudge: how far, in CSS pixels, the cursor has dragged the painting
// shown at each point.
uniform sampler2D uSmudge;
uniform float uSmudgeAmount;
// The cursor's light across the whole screen: uTouch.r is its healing trail.
// Pencil and Digital answer it; a zero strength switches a response off.
uniform sampler2D uTouch;
uniform float uTouchAmount;
uniform float uPixelRatio;
uniform vec3 uStrokeColor;
uniform float uPencilLines;
uniform float uDotsLight;
varying vec2 vUv;

const vec3 LUMA = vec3(.2126, .7152, .0722);

vec2 imageUv(vec2 screenUv) {
  vec3 p = uScreenToImage * vec3(screenUv * 2.0 - 1.0, 1.0);
  return p.xy / p.z * .5 + .5;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

vec3 viewPosition(vec2 uv) {
  vec4 view = uClipToView * vec4(uv * 2.0 - 1.0, texture2D(uTerrainDepth, uv).r * 2.0 - 1.0, 1.0);
  return view.xyz / view.w;
}

// How much of the cursor's light falls here, over terrain and sky alike.
float touchAt(vec2 uv) {
  if (uTouchAmount <= 0.0) return 0.0;
  float touch = texture2D(uTouch, uv).r;
  if (touch < .004) return 0.0;
  // The trail fades at a steady rate; ease its last moments out.
  return touch * touch * (3.0 - 2.0 * touch);
}

// Pencil: the cursor cross-hatches the slope with the terrain's own elevation
// contours. Line density halves or doubles with slope and distance so the hatch
// stays evenly spaced on the page. Open sky has no slope to follow and takes a
// plain diagonal hatch. Light touches leave broken strokes.
vec3 pencilLines(vec3 color, float touch) {
  float depth = texture2D(uTerrainDepth, vUv).r;
  vec4 world = uClipToWorld * vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  world /= world.w;
  float height = (world.y - uTerrainHeight.x) / uTerrainHeight.y;
  // Height change per device pixel.
  float grade = max(fwidth(height), 1e-6);
  float halfWidth = PENCIL_WIDTH * uPixelRatio * .5;
  vec2 page = vUv * uResolution;
  float tooth = noise(page * .8);
  if (depth >= 1.0) {
    float stroke = (page.x * .5 + page.y) / PENCIL_SPACING + noise(page * .02) * .6;
    float offset = abs(fract(stroke) - .5) * PENCIL_SPACING * uPixelRatio;
    float lightness = noise(page * .04) * .6 + tooth * .4;
    float mark = (1.0 - smoothstep(halfWidth, halfWidth + 1.0, offset))
      * smoothstep(lightness - .1, lightness + .15, touch * 1.3);
    return mix(color, uStrokeColor, mark * uPencilLines * .45);
  }
  float octave = clamp(-log2(grade * PENCIL_SPACING * uPixelRatio), 1.0, 12.0);
  float levels = exp2(floor(octave));
  float level = height * levels;
  // Device pixels to the nearest line of this density, and of the next one,
  // whose in-between lines draw in as the hatch opens up.
  float coarse = abs(fract(level + .5) - .5) / (grade * levels);
  float fine = abs(fract(level) - .5) / (grade * levels);
  float line = max(1.0 - smoothstep(halfWidth, halfWidth + 1.0, coarse),
    (1.0 - smoothstep(halfWidth, halfWidth + 1.0, fine)) * fract(octave));
  // Pressure wanders along the slope and paper tooth breaks the graphite.
  float lightness = noise(world.xz * 5.0) * .6 + tooth * .4;
  float mark = line * smoothstep(lightness - .1, lightness + .15, touch * 1.3);
  return mix(color, uStrokeColor, mark * uPencilLines);
}

vec3 digital() {
  // CSS-pixel spacing keeps the same visual weight on high-DPI displays.
  vec2 grid = uResolution / DIGITAL_CELL;
  vec2 cell = floor(vUv * grid);
  vec2 sampleUv = (cell + .5) / grid;
  vec3 sampleColor = texture2D(uTexture, sampleUv).rgb;
  float illumination = dot(sampleColor, LUMA);
  float background = dot(uBackground, LUMA);
  // Lift faint lighting continuously without assigning uniform dots to shadow
  // or fully fogged terrain. Zero contrast against the background stays empty.
  float tone = pow(1.0 - exp(-max(0.0, illumination - background) * 16.0), .8);
  float depth = texture2D(uTerrainDepth, sampleUv).r;
  float terrain = 1.0 - step(1.0, depth);
  // The cursor's light swells the dots it reaches, modelling slopes the scene
  // light leaves empty by how squarely they face the viewer. Each dot answers
  // at its own threshold, so the pool gathers and heals dot by dot.
  float touch = uDotsLight > 0.0 ? touchAt(sampleUv) : 0.0;
  float lamp = 0.0;
  if (touch > 0.0) {
    float shade = DOTS_SKY;
    if (terrain > 0.0) {
      vec3 here = viewPosition(sampleUv);
      vec3 normal = normalize(cross(viewPosition(sampleUv + vec2(1.0 / grid.x, 0.0)) - here,
        viewPosition(sampleUv + vec2(0.0, 1.0 / grid.y)) - here));
      float facing = clamp(dot(normal, normalize(-here)), 0.0, 1.0);
      shade = mix(DOTS_SHADE, 1.0, facing * facing);
    }
    float threshold = hash(cell) * .5;
    lamp = min(smoothstep(threshold, threshold + .3, touch) * shade * uDotsLight, 1.0);
  }
  float lampRadius = .42 * sqrt(lamp);
  float radius = .42 * sqrt(tone);
  float distanceToCenter = length(fract(vUv * grid) - .5);
  float aa = max(fwidth(distanceToCenter), .015);
  float dotShape = (1.0 - smoothstep(radius - aa, radius + aa, distanceToCenter)) * terrain;
  // Fade subpixel dots to zero instead of leaving antialiasing residue at zero radius.
  dotShape *= smoothstep(0.0, .025, tone);
  dotShape *= 1.0 - step(1.0, texture2D(uTerrainDepth, vUv).r);
  // Lit dots are not clipped to the terrain: the light reaches open sky too.
  dotShape = max(dotShape, (1.0 - smoothstep(lampRadius - aa, lampRadius + aa, distanceToCenter))
    * smoothstep(0.0, .025, lamp));

  // Full-size dot cores retain the actual accent. Brightness is carried by
  // coverage, never by an amber tint or an exposure multiplier on the color.
  return mix(uBackground, uDigitalAccent, dotShape);
}

vec3 mediumColor(float medium, vec3 original, vec2 uv) {
  if (medium < .5) return original;
  if (medium > 2.5) return digital();
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return original;
  vec3 color;
  if (medium < 1.5) {
    vec2 smudged = uSmudgeAmount > 0.0 ? imageUv(vUv + texture2D(uSmudge, vUv).rg / uResolution) : uv;
    color = texture2D(uOil, smudged).rgb;
  } else {
    color = texture2D(uPencil, uv).rgb;
    float touch = uPencilLines > 0.0 ? touchAt(vUv) : 0.0;
    if (touch > 0.0) color = pencilLines(color, touch);
  }
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
