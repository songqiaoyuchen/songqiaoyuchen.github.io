// Typewriter reveal: clips its text open in one step per character after a delay (Hero.css).
import type {CSSProperties, ReactNode} from 'react';

export function TypeReveal({
  children,
  delay,
  steps,
  className = '',
}: {
  children: ReactNode;
  delay: number;
  steps: number;
  className?: string;
}) {
  const style = {
    '--type-reveal-delay': `${delay}ms`,
    '--type-reveal-steps': steps,
  } as CSSProperties;

  return (
    <span className={`hero-type-reveal ${className}`} style={style}>
      {children}
    </span>
  );
}
