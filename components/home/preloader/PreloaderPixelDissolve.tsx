'use client';

import {useEffect, useRef} from 'react';
import type {PreloaderState} from './HomepagePreloader';

type PreloaderPixelDissolveProps = {
  reducedMotion: boolean;
  state: PreloaderState;
};

type DissolvePixel = {
  color: string;
  delayMs: number;
  durationMs: number;
  size: number;
  x: number;
  y: number;
};

const PIXEL_COLORS = ['#0a0a0a', '#0d0c09', '#110f0a', '#17130b'] as const;

function seededUnit(x: number, y: number, salt: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + salt * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function drawPixels(
  context: CanvasRenderingContext2D,
  pixels: readonly DissolvePixel[],
  elapsedMs: number,
) {
  let isComplete = true;

  for (const pixel of pixels) {
    const progress = Math.min(
      1,
      Math.max(0, (elapsedMs - pixel.delayMs) / pixel.durationMs),
    );
    if (progress < 1) isComplete = false;

    const size = Math.ceil(pixel.size * (1 - easeInOutCubic(progress)));
    if (size <= 0) continue;

    const offset = Math.floor((pixel.size - size) / 2);
    context.fillStyle = pixel.color;
    context.fillRect(pixel.x + offset, pixel.y + offset, size, size);
  }

  return isComplete;
}

export function PreloaderPixelDissolve({
  reducedMotion,
  state,
}: PreloaderPixelDissolveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pixelsRef = useRef<DissolvePixel[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      context.clearRect(0, 0, width, height);
      drawPixels(context, pixelsRef.current, 0);
    };

    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.imageSmoothingEnabled = false;

      const cellSize = Math.min(64, Math.round(Math.min(width, height) / 36));
      const columns = Math.ceil(width / cellSize);
      const rows = Math.ceil(height / cellSize);
      const centerX = (columns - 1) / 2;
      const centerY = (rows - 1) / 2;
      const maxDistance = Math.max(1, Math.hypot(centerX, centerY));
      const pixels: DissolvePixel[] = [];

      for (let column = 0; column < columns; column += 1) {
        for (let row = 0; row < rows; row += 1) {
          const distance = Math.hypot(column - centerX, row - centerY) / maxDistance;
          pixels.push({
            color: PIXEL_COLORS[
              Math.floor(seededUnit(column, row, 1) * PIXEL_COLORS.length)
            ],
            delayMs: distance * 240 + seededUnit(column, row, 2) * 120,
            durationMs: 620 + seededUnit(column, row, 3) * 160,
            size: cellSize,
            x: column * cellSize,
            y: row * cellSize,
          });
        }
      }

      pixelsRef.current = pixels;
      draw();
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (state !== 'exiting' || reducedMotion) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const startedAt = performance.now();
    const animate = (now: number) => {
      const elapsedMs = now - startedAt;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      context.clearRect(0, 0, width, height);

      const isComplete = drawPixels(context, pixelsRef.current, elapsedMs);

      if (!isComplete) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [reducedMotion, state]);

  return (
    <canvas
      aria-hidden="true"
      className="preloader-pixel-dissolve"
      ref={canvasRef}
    />
  );
}
