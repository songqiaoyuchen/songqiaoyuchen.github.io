'use client';

// Adopted from https://21st.dev

import * as React from 'react';
import {cva, type VariantProps} from 'class-variance-authority';
import {
  motion,
  useMotionTemplate,
  useScroll,
  useTransform,
  type HTMLMotionProps,
  type MotionValue,
} from 'motion/react';
import {cn} from '@/lib/utils';

const cardVariants = cva('absolute will-change-transform', {
  variants: {
    variant: {
      dark: `flex size-full flex-col items-center justify-center gap-6 border
        border-stone-700/50 bg-accent-foreground/80 p-6 backdrop-blur-md`,
      light: `flex size-full flex-col items-center justify-center gap-6 border
        bg-accent bg-background/80 p-6 backdrop-blur-md`,
    },
  },
  defaultVariants: {
    variant: 'light',
  },
});

const STAR_PATH = `M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162
  c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957
  c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448
  c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384
  c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z`;

interface ReviewProps extends React.HTMLAttributes<HTMLDivElement> {
  rating: number;
  maxRating?: number;
}

type CardStickyProps = HTMLMotionProps<'div'>
  & VariantProps<typeof cardVariants>
  & {
    arrayLength: number;
    index: number;
    incrementY?: number;
    incrementZ?: number;
    incrementRotation?: number;
    revealOnPreviousExit?: boolean;
  };

interface ContainerScrollContextValue {
  scrollYProgress: MotionValue<number>;
}

interface ContainerScrollProps extends React.HTMLAttributes<HTMLDivElement> {
  containerRef?: React.RefObject<HTMLElement | null>;
  progressRange?: readonly [number, number];
  scrollProgress?: MotionValue<number>;
}

const ContainerScrollContext = React.createContext<ContainerScrollContextValue | undefined>(
  undefined,
);

export function useContainerScrollContext() {
  const context = React.useContext(ContainerScrollContext);
  if (context === undefined) {
    throw new Error(
      'useContainerScrollContext must be used within a ContainerScroll provider',
    );
  }
  return context;
}

export const ContainerScroll: React.FC<ContainerScrollProps> = ({
  children,
  containerRef,
  progressRange = [0, 1],
  scrollProgress,
  style,
  className,
  ...props
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const {scrollYProgress: rawScrollYProgress} = useScroll(
    containerRef
      ? {container: containerRef}
      : {target: scrollRef, offset: ['start center', 'end end']},
  );
  const scrollYProgress = useTransform(
    rawScrollYProgress,
    [0, 1],
    [progressRange[0], progressRange[1]],
  );
  const activeScrollProgress = scrollProgress ?? scrollYProgress;

  return (
    <ContainerScrollContext.Provider
      value={{scrollYProgress: activeScrollProgress}}
    >
      <div
        className={cn('relative min-h-svh w-full', className)}
        ref={scrollRef}
        style={{perspective: '1000px', ...style}}
        {...props}
      >
        {children}
      </div>
    </ContainerScrollContext.Provider>
  );
};
ContainerScroll.displayName = 'ContainerScroll';

export const CardsContainer = React.forwardRef<
  HTMLDivElement,
  HTMLMotionProps<'div'>
>(({children, className, ...props}, ref) => (
  <motion.div
    className={cn('relative', className)}
    ref={ref}
    style={{perspective: '1000px', ...props.style}}
    {...props}
  >
    {children}
  </motion.div>
));
CardsContainer.displayName = 'CardsContainer';

export const CardTransformed = React.forwardRef<HTMLDivElement, CardStickyProps>(
  (
    {
      arrayLength,
      index,
      incrementY = 10,
      incrementZ = 10,
      incrementRotation = -index + 90,
      revealOnPreviousExit = false,
      className,
      variant,
      style,
      ...props
    },
    ref,
  ) => {
    const {scrollYProgress} = useContainerScrollContext();
    const start = index / (arrayLength + 1);
    const end = (index + 1) / (arrayLength + 1);
    const range = React.useMemo<[number, number]>(() => [start, end], [start, end]);
    const rotateRange = React.useMemo<[number, number]>(
      () => [range[0] - 1.5, range[1] / 1.5],
      [range],
    );
    const revealRange = React.useMemo<[number, number]>(() => {
      const revealStart = index === 0 ? -1 : (index - 1) / (arrayLength + 1);
      return [revealStart, revealStart + 0.0001];
    }, [arrayLength, index]);

    const y = useTransform(scrollYProgress, range, ['0%', '-180%']);
    const rotate = useTransform(scrollYProgress, rotateRange, [incrementRotation, 0]);
    const revealedOpacity = useTransform(scrollYProgress, revealRange, [0, 1]);
    const translateZ = index === 0 ? 0.001 : index * incrementZ;
    const transform = useMotionTemplate`translateZ(${translateZ}px) translateY(${y}) rotate(${rotate}deg)`;

    const dx = useTransform(scrollYProgress, rotateRange, [4, 0]);
    const dy = useTransform(scrollYProgress, rotateRange, [4, 12]);
    const blur = useTransform(scrollYProgress, rotateRange, [2, 24]);
    const alpha = useTransform(scrollYProgress, rotateRange, [0.15, 0.2]);
    const lightFilter = useMotionTemplate`drop-shadow(${dx}px ${dy}px ${blur}px rgba(0,0,0,${alpha}))`;
    const filter = variant === 'light' ? lightFilter : 'none';

    const cardStyle = {
      top: index * incrementY,
      transform,
      backfaceVisibility: 'hidden' as const,
      zIndex: (arrayLength - index) * incrementZ,
      filter,
      ...(revealOnPreviousExit ? {opacity: revealedOpacity} : {}),
      ...style,
    };

    return (
      <motion.div
        className={cn(cardVariants({variant, className}))}
        layout="position"
        ref={ref}
        style={cardStyle}
        {...props}
      />
    );
  },
);
CardTransformed.displayName = 'CardTransformed';

export const ReviewStars = React.forwardRef<HTMLDivElement, ReviewProps>(
  ({rating, maxRating = 5, className, ...props}, ref) => {
    const filledStars = Math.floor(rating);
    const fractionalPart = rating - filledStars;
    const emptyStars = maxRating - filledStars - (fractionalPart > 0 ? 1 : 0);

    return (
      <div className={cn('flex items-center gap-2', className)} ref={ref} {...props}>
        <div className="flex items-center">
          {[...Array(filledStars)].map((_, index) => (
            <svg
              className="size-4 text-inherit"
              fill="currentColor"
              key={`filled-${index}`}
              viewBox="0 0 20 20"
            >
              <path d={STAR_PATH} />
            </svg>
          ))}
          {fractionalPart > 0 && (
            <svg className="size-4 text-inherit" fill="currentColor" viewBox="0 0 20 20">
              <defs>
                <linearGradient id="half">
                  <stop offset={`${fractionalPart * 100}%`} stopColor="currentColor" />
                  <stop offset={`${fractionalPart * 100}%`} stopColor="rgb(209 213 219)" />
                </linearGradient>
              </defs>
              <path
                d={STAR_PATH}
                fill="url(#half)"
              />
            </svg>
          )}
          {[...Array(emptyStars)].map((_, index) => (
            <svg
              className="size-4 text-gray-300"
              fill="currentColor"
              key={`empty-${index}`}
              viewBox="0 0 20 20"
            >
              <path d={STAR_PATH} />
            </svg>
          ))}
        </div>
        <p className="sr-only">{rating}</p>
      </div>
    );
  },
);
ReviewStars.displayName = 'ReviewStars';
