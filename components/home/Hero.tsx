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
        ${isHidden
          ? 'pointer-events-none -translate-y-[calc(50%+8px)] opacity-0'
          : 'pointer-events-auto -translate-y-1/2 opacity-100'}
      `}
    >
      <div className="animate-fade-in motion-reduce:animate-none">
        <h1 className="font-serif text-[26px] font-normal italic leading-[1.2] text-text">
          Hello, I&apos;m Sophon.
        </h1>
      </div>
    </section>
  );
}
