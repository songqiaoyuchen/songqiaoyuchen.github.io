// Card whose surface fills with shimmering pixels on hover/focus (used by ProjectCard).
// Adopted from https://reactbits.dev/components/pixel-card

import {useEffect, useRef, type JSX} from 'react';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {
  getEffectiveSpeed,
  Pixel,
  rasterizePixel,
  readPixelColor,
  type PixelAnimation,
} from './pixelCardPixels';


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
  active?: boolean;
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
  active,
  className = '',
  children
}: PixelCardProps): JSX.Element {
  const isControlled = active !== undefined;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Starts an appear or disappear; the effect below owns the loop and sets this.
  const startAnimationRef = useRef<(name: PixelAnimation) => void>(() => {});
  const reducedMotion = useReducedMotion();

  const variantCfg: VariantConfig = VARIANTS[variant] || VARIANTS.default;
  const finalGap = gap ?? variantCfg.gap;
  const finalSpeed = speed ?? variantCfg.speed;
  const finalColors = colors ?? variantCfg.colors;
  const finalNoFocus = noFocus ?? variantCfg.noFocus;

  const onMouseEnter = () => startAnimationRef.current('appear');
  const onMouseLeave = () => startAnimationRef.current('disappear');
  const onFocus: React.FocusEventHandler<HTMLDivElement> = e => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    startAnimationRef.current('appear');
  };
  const onBlur: React.FocusEventHandler<HTMLDivElement> = e => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    startAnimationRef.current('disappear');
  };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let width = 0;
    let height = 0;
    let ctx: CanvasRenderingContext2D | null = null;
    let frame: ImageData | null = null;
    // Null until the first appear: nothing shows at rest, so the pixels (thousands per card) wait for it.
    let pixels: Pixel[] | null = null;
    let animation: number | null = null;
    let timePrevious = 0;

    // Sizes the canvas to the card and drops any pixels: the next appear builds them for the new size.
    const initPixels = (nextWidth: number, nextHeight: number) => {
      width = nextWidth;
      height = nextHeight;
      pixels = null;
      frame = null;
      ctx = width > 0 && height > 0 ? canvas.getContext('2d') : null;
      if (!ctx) return;

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.clearRect(0, 0, width, height);
    };

    function buildPixels() {
      if (!ctx) return;
      frame = ctx.createImageData(width, height);
      const colorsArray = finalColors.split(',').map(readPixelColor);
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
      pixels = pxs;
    }

    function animate(fnName: PixelAnimation) {
      animation = requestAnimationFrame(() => animate(fnName));
      const timeNow = performance.now();
      const timePassed = timeNow - timePrevious;
      const timeInterval = 1000 / 60;

      if (timePassed < timeInterval) return;
      timePrevious = timeNow - (timePassed % timeInterval);

      if (!ctx) return;
      if (!pixels) buildPixels();
      if (!frame || !pixels) return;

      frame.data.fill(0);

      let allIdle = true;
      for (let i = 0; i < pixels.length; i++) {
        const pixel = pixels[i];
        pixel[fnName]();
        rasterizePixel(frame, pixel);
        if (!pixel.isIdle) {
          allIdle = false;
        }
      }
      ctx.putImageData(frame, 0, 0);
      if (allIdle) {
        cancelAnimationFrame(animation);
      }
    }

    startAnimationRef.current = (name) => {
      if (animation !== null) {
        cancelAnimationFrame(animation);
      }
      // No pixels yet means nothing drawn (a controlled card mounts inactive): a disappear has nothing to clear.
      if (name === 'disappear' && !pixels) return;
      animation = requestAnimationFrame(() => animate(name));
    };

    const measure = () => {
      const rect = container.getBoundingClientRect();
      return {width: Math.floor(rect.width), height: Math.floor(rect.height)};
    };
    const size = measure();
    initPixels(size.width, size.height);
    const observer = new ResizeObserver(() => {
      // The observer reports once on observe, with the size just set.
      const next = measure();
      if (next.width === width && next.height === height) return;
      initPixels(next.width, next.height);
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      startAnimationRef.current = () => {};
      if (animation !== null) {
        cancelAnimationFrame(animation);
      }
    };
  }, [finalGap, finalSpeed, finalColors, reducedMotion]);

  useEffect(() => {
    if (!isControlled) return;
    startAnimationRef.current(active ? 'appear' : 'disappear');
  }, [active, isControlled]);

  const isActive = active ?? false;
  const interactionClassName = isControlled
    ? isActive ? 'border-accent-dim' : ''
    : 'hover:border-accent-dim focus-within:border-accent-dim';
  const contentClassName = isControlled
    ? isActive ? 'opacity-30' : ''
    : 'group-hover:opacity-30 group-focus-within:opacity-30';
  const overlayClassName = isControlled
    ? isActive ? 'before:opacity-100' : ''
    : 'hover:before:opacity-100 focus-within:before:opacity-100';

  return (
    <div
      ref={containerRef}
      className={`
        group relative isolate grid w-full place-items-stretch overflow-hidden
        rounded-2xl border border-accent-soft transition-colors duration-200
        ease-pixel select-none before:pointer-events-none
        before:absolute before:inset-0 before:z-10 before:m-auto before:aspect-square
        before:bg-pixel-card before:opacity-0
        before:transition-opacity before:duration-400
        before:ease-pixel before:content-['']
        ${interactionClassName}
        ${overlayClassName}
        ${className}
      `}
      onMouseEnter={isControlled ? undefined : onMouseEnter}
      onMouseLeave={isControlled ? undefined : onMouseLeave}
      onFocus={isControlled || finalNoFocus ? undefined : onFocus}
      onBlur={isControlled || finalNoFocus ? undefined : onBlur}
      tabIndex={finalNoFocus ? undefined : 0}
    >
      <canvas className="absolute inset-0 z-0 block h-full w-full" ref={canvasRef} />
      <div
        className={`relative z-20 w-full transition-opacity duration-400 ease-pixel ${contentClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
