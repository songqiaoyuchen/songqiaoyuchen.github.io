'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {gsap} from 'gsap';
import {useMotionValue, useMotionValueEvent} from 'motion/react';
import {FEATURED_ARTWORKS} from '@/data/artworks';
import {ArtworkLightbox} from '@/components/artworks/ArtworkLightbox';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {
  CardsContainer,
  CardTransformed,
  ContainerScroll,
  useContainerScrollContext,
} from './CardStack';

const FOCUS_RING = `focus-visible:outline-1 focus-visible:outline-offset-4
  focus-visible:outline-accent`;
const MAX_WHEEL_DELTA = 160;
const POINTER_STAGE_DISTANCE = 180;
const SCROLL_DAMPING_DURATION = 0.3;
const SNAP_DELAY = 140;
const SNAP_DURATION = 0.36;
const WHEEL_STAGE_DISTANCE = 200;

interface ArtworkStackContentProps {
  onActiveIndexChange: (index: number) => void;
  onArtworkOpen: (index: number) => void;
  interactionProps: ComponentPropsWithRef<'div'>;
}

function ArtworkStackContent({
  onActiveIndexChange,
  onArtworkOpen,
  interactionProps,
}: ArtworkStackContentProps) {
  const {scrollYProgress} = useContainerScrollContext();
  const artworkCount = FEATURED_ARTWORKS.length;

  useMotionValueEvent(scrollYProgress, 'change', (progress) => {
    const nextIndex = Math.max(
      0,
      Math.min(
        artworkCount - 1,
        Math.round(progress * (artworkCount + 1)),
      ),
    );
    onActiveIndexChange(nextIndex);
  });

  return (
    <CardsContainer
      className={`sticky top-2 mx-auto w-[60%] max-w-120 touch-none ${FOCUS_RING}`}
      role="group"
      style={{
        aspectRatio: Math.min(
          ...FEATURED_ARTWORKS.map((artwork) => artwork.width / artwork.height),
        ),
      }}
      {...interactionProps}
    >
      {FEATURED_ARTWORKS.map((artwork, index) => (
        <CardTransformed
          arrayLength={artworkCount}
          className="h-auto w-full overflow-hidden border-0 bg-transparent p-0 backdrop-blur-none"
          index={index}
          key={artwork.id}
          layout={false}
          style={{aspectRatio: artwork.width / artwork.height}}
        >
          <button
            aria-haspopup="dialog"
            aria-label={`Open ${artwork.title}, artwork ${index + 1} of ${artworkCount}`}
            className="size-full cursor-zoom-in border-0 bg-transparent p-0 focus-visible:outline-1
              focus-visible:outline-offset-4 focus-visible:outline-accent"
            onClick={() => onArtworkOpen(index)}
            onKeyDown={(event) => event.stopPropagation()}
            type="button"
          >
            <Image
              alt={artwork.alt}
              className="size-full select-none object-contain"
              draggable={false}
              height={artwork.height}
              priority={index === 0}
              sizes="(max-width: 639px) calc(100vw - 72px), 500px"
              src={artwork.src}
              width={artwork.width}
            />
          </button>
        </CardTransformed>
      ))}
    </CardsContainer>
  );
}

export function ArtworkStack() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [openArtworkIndex, setOpenArtworkIndex] = useState<number | null>(null);
  const stackInteractionRef = useRef<HTMLDivElement>(null);
  const targetIndexRef = useRef(0);
  const scrollTweenRef = useRef<ReturnType<typeof gsap.to> | null>(null);
  const progressProxyRef = useRef({value: 0});
  const pointerStartYRef = useRef<number | null>(null);
  const pointerStartPositionRef = useRef(0);
  const virtualPositionRef = useRef(0);
  const isSnappingRef = useRef(false);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stackProgress = useMotionValue(0);
  const isReducedMotion = useReducedMotion();
  const activeArtwork = FEATURED_ARTWORKS[activeIndex];
  const artworkCount = FEATURED_ARTWORKS.length;
  const maxPosition = artworkCount - 1;

  const updateActiveIndex = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const closeArtwork = useCallback(() => {
    setOpenArtworkIndex(null);
    window.setTimeout(() => stackInteractionRef.current?.focus(), 0);
  }, []);

  const animateToPosition = useCallback((position: number, shouldSnap: boolean) => {
    const nextPosition = Math.max(0, Math.min(maxPosition, position));
    const nextProgress = nextPosition / (artworkCount + 1);
    const nextIndex = Math.round(nextPosition);
    targetIndexRef.current = nextIndex;
    virtualPositionRef.current = nextPosition;
    isSnappingRef.current = shouldSnap;
    scrollTweenRef.current?.kill();

    if (isReducedMotion) {
      progressProxyRef.current.value = nextPosition;
      stackProgress.set(nextProgress);
      scrollTweenRef.current = null;
      if (shouldSnap) {
        isSnappingRef.current = false;
        setActiveIndex(nextIndex);
      }
      return;
    }

    scrollTweenRef.current = gsap.to(progressProxyRef.current, {
      duration: shouldSnap ? SNAP_DURATION : SCROLL_DAMPING_DURATION,
      ease: shouldSnap ? 'power3.out' : 'power2.out',
      overwrite: true,
      value: nextPosition,
      onUpdate: () => {
        stackProgress.set(progressProxyRef.current.value / (artworkCount + 1));
      },
      onComplete: () => {
        stackProgress.set(nextProgress);
        scrollTweenRef.current = null;
        if (shouldSnap) {
          isSnappingRef.current = false;
          setActiveIndex(nextIndex);
        }
      },
    });
  }, [artworkCount, isReducedMotion, maxPosition, stackProgress]);

  const snapToNearestStage = useCallback(() => {
    animateToPosition(Math.round(virtualPositionRef.current), true);
  }, [animateToPosition]);

  useEffect(() => {
    const interactionSurface = stackInteractionRef.current;
    if (!interactionSurface) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (Math.abs(event.deltaY) < 1) return;
      if (snapTimerRef.current) {
        clearTimeout(snapTimerRef.current);
      }

      const deltaModeMultiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? interactionSurface.clientHeight
          : 1;
      const pixelDelta = event.deltaY * deltaModeMultiplier;
      const clampedDelta = Math.max(
        -MAX_WHEEL_DELTA,
        Math.min(MAX_WHEEL_DELTA, pixelDelta),
      );

      if (isSnappingRef.current) {
        virtualPositionRef.current = progressProxyRef.current.value;
        isSnappingRef.current = false;
      }

      animateToPosition(
        virtualPositionRef.current + clampedDelta / WHEEL_STAGE_DISTANCE,
        false,
      );
      snapTimerRef.current = setTimeout(snapToNearestStage, SNAP_DELAY);
    };

    interactionSurface.addEventListener('wheel', handleWheel, {passive: false});
    return () => {
      interactionSurface.removeEventListener('wheel', handleWheel);
      if (snapTimerRef.current) {
        clearTimeout(snapTimerRef.current);
      }
      scrollTweenRef.current?.kill();
    };
  }, [animateToPosition, snapToNearestStage]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let nextIndex: number | undefined;

    if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(event.key)) {
      nextIndex = targetIndexRef.current + 1;
    } else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key)) {
      nextIndex = targetIndexRef.current - 1;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = artworkCount - 1;
    }

    if (nextIndex === undefined) return;
    event.preventDefault();
    animateToPosition(nextIndex, true);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return;
    pointerStartYRef.current = event.clientY;
    pointerStartPositionRef.current = progressProxyRef.current.value;
    virtualPositionRef.current = progressProxyRef.current.value;
    isSnappingRef.current = false;
    scrollTweenRef.current?.kill();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const startY = pointerStartYRef.current;
    if (startY === null) return;

    const nextPosition = pointerStartPositionRef.current
      + (startY - event.clientY) / POINTER_STAGE_DISTANCE;
    animateToPosition(nextPosition, false);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerStartYRef.current === null) return;
    pointerStartYRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    snapToNearestStage();
  };

  return (
    <section aria-label="Featured artworks">
      {/* hardcoding the pb here to prevent cropping of long images */}
      <div
        className="relative mr-11 overflow-clip pt-5 pb-20"
      >
        <ContainerScroll
          className="min-h-0 py-2"
          scrollProgress={stackProgress}
        >
          <ArtworkStackContent
            onActiveIndexChange={updateActiveIndex}
            onArtworkOpen={setOpenArtworkIndex}
            interactionProps={{
              'aria-label': 'Scroll through featured artworks',
              onKeyDown: handleKeyDown,
              onPointerCancel: handlePointerUp,
              onPointerDown: handlePointerDown,
              onPointerMove: handlePointerMove,
              onPointerUp: handlePointerUp,
              ref: stackInteractionRef,
              tabIndex: 0,
            }}
          />
        </ContainerScroll>
      </div>

      <div aria-atomic="true" aria-live="polite" className="mt-4">
        <p className="mb-0 font-mono text-micro tracking-meta text-dim">
          {String(activeIndex + 1).padStart(2, '0')} /{' '}
          {String(FEATURED_ARTWORKS.length).padStart(2, '0')}
        </p>
        <h3 className="mb-0 mt-2 font-serif text-card font-normal leading-tight text-text">
          {activeArtwork.title}
        </h3>
        <p className="mb-0 mt-1.5 font-mono text-meta leading-meta tracking-meta text-muted-soft">
          {activeArtwork.material} <span aria-hidden="true" className="text-dim">/</span>{' '}
          {activeArtwork.size}
        </p>
        <p className="mb-0 mt-3 max-w-copy font-mono text-copy leading-copy text-muted">
          {activeArtwork.description}
        </p>
      </div>

      <Link
        className={`mt-3 inline-flex min-h-11 items-center font-mono text-label uppercase
          tracking-label text-accent transition-colors duration-interaction hover:text-text
          ${FOCUS_RING}`}
        href="/artworks"
      >
        View all artworks <span aria-hidden="true" className="ml-2">&rarr;</span>
      </Link>

      {openArtworkIndex !== null && (
        <ArtworkLightbox
          artwork={FEATURED_ARTWORKS[openArtworkIndex]}
          onClose={closeArtwork}
        />
      )}
    </section>
  );
}
