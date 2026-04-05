export function HomeOverlay() {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-start pt-[15vh]">
      <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight drop-shadow-lg">
        Hello World
      </h1>
    </div>
  );
}
