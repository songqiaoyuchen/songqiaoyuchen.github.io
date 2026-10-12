// Pixel engine for PixelCard: shimmering pixels rasterized straight into ImageData (no per-pixel fillRect).
export type PixelColor = {
  alpha: number;
  blue: number;
  green: number;
  red: number;
};

export type PixelAnimation = 'appear' | 'disappear';

export class Pixel {
  x: number;
  y: number;
  color: PixelColor;
  speed: number;
  size: number;
  sizeStep: number;
  minSize: number;
  maxSizeInteger: number;
  maxSize: number;
  delay: number;
  counter: number;
  counterStep: number;
  isIdle: boolean;
  isReverse: boolean;
  isShimmer: boolean;

  constructor(
    canvasWidth: number,
    canvasHeight: number,
    x: number,
    y: number,
    color: PixelColor,
    speed: number,
    delay: number
  ) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.speed = this.getRandomValue(0.1, 0.9) * speed;
    this.size = 0;
    this.sizeStep = Math.random() * 0.4;
    this.minSize = 0.5;
    this.maxSizeInteger = 2;
    this.maxSize = this.getRandomValue(this.minSize, this.maxSizeInteger);
    this.delay = delay;
    this.counter = 0;
    this.counterStep = Math.random() * 4 + (canvasWidth + canvasHeight) * 0.01;
    this.isIdle = false;
    this.isReverse = false;
    this.isShimmer = false;
  }

  getRandomValue(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  appear() {
    this.isIdle = false;
    if (this.counter <= this.delay) {
      this.counter += this.counterStep;
      return;
    }
    if (this.size >= this.maxSize) {
      this.isShimmer = true;
    }
    if (this.isShimmer) {
      this.shimmer();
    } else {
      this.size += this.sizeStep;
    }
  }

  disappear() {
    this.isShimmer = false;
    this.counter = 0;
    if (this.size <= 0) {
      this.isIdle = true;
      return;
    } else {
      this.size -= 0.1;
    }
  }

  shimmer() {
    if (this.size >= this.maxSize) {
      this.isReverse = true;
    } else if (this.size <= this.minSize) {
      this.isReverse = false;
    }
    if (this.isReverse) {
      this.size -= this.speed;
    } else {
      this.size += this.speed;
    }
  }
}

// One CPU-side 1x1 canvas parses every card's colours: reading a card's own (GPU-backed) canvas would stall on the
// GPU while the scene is busy. Parsed colours are kept per string, so each is read once.
let colorContext: CanvasRenderingContext2D | null = null;
const parsedColors = new Map<string, PixelColor>();

export function readPixelColor(value: string): PixelColor {
  const key = value.trim();
  const cached = parsedColors.get(key);
  if (cached) return cached;
  if (!colorContext) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    colorContext = canvas.getContext('2d', {willReadFrequently: true});
  }
  const context = colorContext;
  if (!context) return {alpha: 0, blue: 0, green: 0, red: 0};
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = key;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  const color = {alpha, blue, green, red};
  parsedColors.set(key, color);
  return color;
}

function blendPixel(
  data: Uint8ClampedArray,
  index: number,
  color: PixelColor,
  coverage: number,
) {
  const sourceAlphaByte = Math.round(color.alpha * coverage);
  if (sourceAlphaByte <= 0) return;

  const destinationAlphaByte = data[index + 3];
  if (destinationAlphaByte === 0 || sourceAlphaByte === 255) {
    data[index] = color.red;
    data[index + 1] = color.green;
    data[index + 2] = color.blue;
    data[index + 3] = sourceAlphaByte;
    return;
  }

  const sourceAlpha = sourceAlphaByte / 255;
  const destinationAlpha = destinationAlphaByte / 255;
  const inverseSourceAlpha = 1 - sourceAlpha;
  const outputAlpha = sourceAlpha + destinationAlpha * inverseSourceAlpha;
  data[index] = Math.round((
    color.red * sourceAlpha
    + data[index] * destinationAlpha * inverseSourceAlpha
  ) / outputAlpha);
  data[index + 1] = Math.round((
    color.green * sourceAlpha
    + data[index + 1] * destinationAlpha * inverseSourceAlpha
  ) / outputAlpha);
  data[index + 2] = Math.round((
    color.blue * sourceAlpha
    + data[index + 2] * destinationAlpha * inverseSourceAlpha
  ) / outputAlpha);
  data[index + 3] = Math.round(outputAlpha * 255);
}

export function rasterizePixel(frame: ImageData, pixel: Pixel) {
  if (pixel.size <= 0) return;

  const centerOffset = pixel.maxSizeInteger * 0.5 - pixel.size * 0.5;
  const left = pixel.x + centerOffset;
  const top = pixel.y + centerOffset;
  const right = left + pixel.size;
  const bottom = top + pixel.size;
  const startX = Math.max(0, Math.floor(left));
  const startY = Math.max(0, Math.floor(top));
  const endX = Math.min(frame.width, Math.ceil(right));
  const endY = Math.min(frame.height, Math.ceil(bottom));

  for (let y = startY; y < endY; y++) {
    const verticalCoverage = Math.min(bottom, y + 1) - Math.max(top, y);
    for (let x = startX; x < endX; x++) {
      const horizontalCoverage = Math.min(right, x + 1) - Math.max(left, x);
      const coverage = horizontalCoverage * verticalCoverage;
      blendPixel(frame.data, (y * frame.width + x) * 4, pixel.color, coverage);
    }
  }
}

export function getEffectiveSpeed(value: number, reducedMotion: boolean) {
  const min = 0;
  const max = 100;
  const throttle = 0.001;

  if (value <= min || reducedMotion) {
    return min;
  } else if (value >= max) {
    return max * throttle;
  } else {
    return value * throttle;
  }
}
