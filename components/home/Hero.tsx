'use client';

interface HeroProps {
  isHidden: boolean;
}

export function Hero({isHidden}: HeroProps) {
  return (
    <section
      aria-hidden={isHidden}
      aria-label="Introduction"
      className={`
        absolute left-1/2 top-1/2 z-30 w-[min(340px,calc(100vw-48px))]
        -translate-x-1/2 border border-line bg-surface px-6 py-7 backdrop-blur-[14px]
        transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-opacity
        min-[768px]:left-[43%] min-[768px]:right-[4%] min-[768px]:w-auto
        min-[768px]:top-[clamp(112px,14vh,150px)] min-[768px]:bottom-[40vh]
        min-[768px]:flex min-[768px]:items-center
        min-[768px]:translate-x-0 min-[768px]:border-0 min-[768px]:bg-transparent
        min-[768px]:p-0 min-[768px]:backdrop-blur-none
        ${isHidden
          ? `pointer-events-none -translate-y-[calc(50%+8px)] opacity-0
            min-[768px]:-translate-y-2`
          : `pointer-events-auto -translate-y-1/2 opacity-100
            min-[768px]:translate-y-0`}
      `}
    >
      <div className="animate-fade-in motion-reduce:animate-none">
        <h1 className="font-serif text-[26px] font-normal italic leading-[1.2] text-text
          min-[768px]:whitespace-nowrap min-[768px]:text-[clamp(36px,4.8vw,76px)]
          min-[768px]:leading-[1.05]">
          Hello, I&apos;m Song
        </h1>
      </div>
    </section>
  );
}
