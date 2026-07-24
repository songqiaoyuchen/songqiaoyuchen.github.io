// Adopted from https://reactbits.dev/components/pixel-card

import {useEffect, useRef, type JSX} from 'react';

type PixelColor = {
  alpha: number;
  blue: number;
  green: number;
  red: number;
};

type PixelAnimation = 'appear' | 'disappear';

class Pixel {
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

function readPixelColor(context: CanvasRenderingContext2D, value: string): PixelColor {
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = value.trim();
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  return {alpha, blue, green, red};
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

function rasterizePixel(frame: ImageData, pixel: Pixel) {
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

function getEffectiveSpeed(value: number, reducedMotion: boolean) {
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

const VARIANTS = {
  default: {
    activeColor: null,
    gap: 5,
    speed: 35,
    colors: '#f8fafc,#f1f5f9,#cbd5e1',
    noFocus: false
  },
  blue: {
    activeColor: '#e0f2fe',
    gap: 10,
    speed: 25,
    colors: '#e0f2fe,#7dd3fc,#0ea5e9',
    noFocus: false
  },
  yellow: {
    activeColor: '#fff8c3',
    gap: 3,
    speed: 20,
    colors: '#f9f4cb,#dfd5a1,#bcaf8b',
    noFocus: false
  },
  pink: {
    activeColor: '#fecdd3',
    gap: 6,
    speed: 80,
    colors: '#fecdd3,#fda4af,#e11d48',
    noFocus: true
  }
};

interface PixelCardProps {
  variant?: 'default' | 'blue' | 'yellow' | 'pink';
  gap?: number;
  speed?: number;
  colors?: string;
  noFocus?: boolean;
  className?: string;
  children: React.ReactNode;
}

interface VariantConfig {
  activeColor: string | null;
  gap: number;
  speed: number;
  colors: string;
  noFocus: boolean;
}

export default function PixelCard({
  variant = 'default',
  gap,
  speed,
  colors,
  noFocus,
  className = '',
  children
}: PixelCardProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const frameRef = useRef<ImageData | null>(null);
  const pixelsRef = useRef<Pixel[]>([]);
  const animationRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const timePreviousRef = useRef(performance.now());
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ).current;

  const variantCfg: VariantConfig = VARIANTS[variant] || VARIANTS.default;
  const finalGap = gap ?? variantCfg.gap;
  const finalSpeed = speed ?? variantCfg.speed;
  const finalColors = colors ?? variantCfg.colors;
  const finalNoFocus = noFocus ?? variantCfg.noFocus;

  const initPixels = () => {
    if (!containerRef.current || !canvasRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);
    const ctx = canvasRef.current.getContext('2d');

    if (width <= 0 || height <= 0 || !ctx) {
      pixelsRef.current = [];
      contextRef.current = null;
      frameRef.current = null;
      return;
    }

    canvasRef.current.width = width;
    canvasRef.current.height = height;
    canvasRef.current.style.width = `${width}px`;
    canvasRef.current.style.height = `${height}px`;

    contextRef.current = ctx;
    frameRef.current = ctx.createImageData(width, height);
    const colorsArray = finalColors.split(',').map((color) => readPixelColor(ctx, color));
    ctx.clearRect(0, 0, width, height);
    const pixelGap = Math.max(1, Math.floor(finalGap));
    const pxs = [];
    for (let x = 0; x < width; x += pixelGap) {
      for (let y = 0; y < height; y += pixelGap) {
        const color = colorsArray[Math.floor(Math.random() * colorsArray.length)];

        const dx = x - width / 2;
        const dy = y - height / 2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const delay = reducedMotion ? 0 : distance * 0.75;
        pxs.push(new Pixel(
          width,
          height,
          x,
          y,
          color,
          getEffectiveSpeed(finalSpeed, reducedMotion),
          delay,
        ));
      }
    }
    pixelsRef.current = pxs;
  };

  const doAnimate = (fnName: PixelAnimation) => {
    animationRef.current = requestAnimationFrame(() => doAnimate(fnName));
    const timeNow = performance.now();
    const timePassed = timeNow - timePreviousRef.current;
    const timeInterval = 1000 / 60;

    if (timePassed < timeInterval) return;
    timePreviousRef.current = timeNow - (timePassed % timeInterval);

    const ctx = contextRef.current;
    const frame = frameRef.current;
    if (!ctx || !frame) return;

    frame.data.fill(0);

    let allIdle = true;
    for (let i = 0; i < pixelsRef.current.length; i++) {
      const pixel = pixelsRef.current[i];
      pixel[fnName]();
      rasterizePixel(frame, pixel);
      if (!pixel.isIdle) {
        allIdle = false;
      }
    }
    ctx.putImageData(frame, 0, 0);
    if (allIdle) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const handleAnimation = (name: PixelAnimation) => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(() => doAnimate(name));
  };

  const onMouseEnter = () => handleAnimation('appear');
  const onMouseLeave = () => handleAnimation('disappear');
  const onFocus: React.FocusEventHandler<HTMLDivElement> = e => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    handleAnimation('appear');
  };
  const onBlur: React.FocusEventHandler<HTMLDivElement> = e => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    handleAnimation('disappear');
  };

  useEffect(() => {
    initPixels();
    const observer = new ResizeObserver(() => {
      initPixels();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => {
      observer.disconnect();
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalGap, finalSpeed, finalColors, finalNoFocus]);

  return (
    <div
      ref={containerRef}
      className={`
        group relative isolate inline-grid w-fit place-items-center overflow-hidden
        rounded-2xl border-accent-soft border transition-colors duration-200
        hover:border-accent-dim focus-within:border-accent-dim
        ease-pixel select-none before:pointer-events-none
        before:absolute before:inset-0 before:z-10 before:m-auto before:aspect-square
        before:bg-pixel-card before:opacity-0
        before:transition-opacity before:duration-400
        before:ease-pixel before:content-['']
        hover:before:opacity-100 focus-within:before:opacity-100 ${className}
      `}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={finalNoFocus ? undefined : onFocus}
      onBlur={finalNoFocus ? undefined : onBlur}
      tabIndex={finalNoFocus ? -1 : 0}
    >
      <canvas className="absolute inset-0 z-0 block h-full w-full" ref={canvasRef} />
      <div
        className="relative z-20 transition-opacity duration-400
          ease-pixel group-hover:opacity-30 group-focus-within:opacity-30"
      >
        {children}
      </div>
    </div>
  );
}
