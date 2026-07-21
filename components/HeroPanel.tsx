'use client';

import FadeContent from '@/components/FadeContent/FadeContent';

type Props = {
  isFocused: boolean;
};

export function HeroPanel({ isFocused }: Props) {
  return (
    <div
      className={`absolute left-1/2 top-1/2 z-30 w-[min(340px,calc(100vw-48px))] -translate-x-1/2 border border-line bg-surface px-6 py-7 backdrop-blur-[14px] transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-opacity ${
        isFocused
          ? '-translate-y-[calc(50%+8px)] opacity-0 pointer-events-none'
          : '-translate-y-1/2 opacity-100 pointer-events-auto'
      }`}
      role="region"
      aria-label="Introduction"
      aria-hidden={isFocused}
    >
      <FadeContent blur duration={1000} ease="power2.out" initialOpacity={0}>
        <h1 className="font-serif text-[26px] font-normal italic leading-[1.2] text-text">
          Hello, I&apos;m Sophon.
        </h1>
      </FadeContent>
    </div>
  );
}
