export function HomeOverlay() {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none select-none">

      {/* Hero typography — upper left */}
      <div className="absolute inset-0 flex flex-col justify-start pt-[14vh] px-12 md:px-20 max-w-[60%]">
        <h1 className="text-white text-7xl md:text-8xl lg:text-9xl font-bold leading-[0.92] tracking-tight mb-6">
          Your Name
        </h1>
        <p className="text-white/50 text-xl md:text-2xl tracking-wide">
          Researcher · Builder · Explorer
        </p>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-white/25 text-[10px] tracking-[0.3em] uppercase">Scroll</span>
        <div className="w-px h-8 bg-white/15" />
      </div>

    </div>
  );
}
