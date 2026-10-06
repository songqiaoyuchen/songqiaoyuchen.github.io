// Animated integer counter (Motion) that writes straight to the DOM instead of re-rendering.
'use client';

import {useEffect, useRef} from 'react';
import {animate, useMotionValue, useMotionValueEvent} from 'motion/react';

type CountUpProps = {
  className?: string;
  durationMs: number;
  from?: number;
  to: number;
};

export function CountUp({
  className,
  durationMs,
  from = 0,
  to,
}: CountUpProps) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const value = useMotionValue(from);

  useMotionValueEvent(value, 'change', (latest) => {
    if (!valueRef.current) return;
    valueRef.current.textContent = Math.round(latest).toString();
  });

  useEffect(() => {
    const controls = animate(value, to, {
      duration: durationMs / 1000,
      ease: 'linear',
    });
    return () => controls.stop();
  }, [durationMs, to, value]);

  return (
    <span className={className} ref={valueRef}>
      {Math.round(from)}
    </span>
  );
}
