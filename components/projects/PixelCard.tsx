// Card whose surface fills with shimmering pixels on hover/focus (used by ProjectCard).
// Adopted from https://reactbits.dev/components/pixel-card

import {useCallback, useEffect, useRef, type JSX} from 'react';
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
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const frameRef = useRef<ImageData | null>(null);
  const pixelsRef = useRef<Pixel[]>([]);
  const animationRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const timePreviousRef = useRef(performance.now());
  const reducedMotion = useReducedMotion();

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

  const doAnimate = useCallback((fnName: PixelAnimation) => {
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
  }, []);

  const handleAnimation = useCallback((name: PixelAnimation) => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(() => doAnimate(name));
  }, [doAnimate]);

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
  }, [finalGap, finalSpeed, finalColors, finalNoFocus, reducedMotion]);

  useEffect(() => {
    if (!isControlled) return;
    handleAnimation(active ? 'appear' : 'disappear');
  }, [active, handleAnimation, isControlled]);

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
