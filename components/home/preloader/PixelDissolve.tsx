// Canvas that covers the page in dark cells and dissolves them when the preloader exits.
'use client';

import {useEffect, useRef} from 'react';
import {createDissolvePixels, drawPixels, type DissolvePixel} from './dissolvePixels';
import type {PreloaderState} from './Preloader';

type PixelDissolveProps = {
  reducedMotion: boolean;
  state: PreloaderState;
};

export function PixelDissolve({
  reducedMotion,
  state,
}: PixelDissolveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pixelsRef = useRef<DissolvePixel[]>([]);

  // Rebuild the cell grid at the canvas size and draw it fully covered.
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

      pixelsRef.current = createDissolvePixels(width, height);
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

  // Exit: animate the cells away.
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
