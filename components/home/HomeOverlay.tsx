import type { HomeLocation } from './scene/locations/homeLocations';

interface HomeOverlayProps {
  activeLocation: HomeLocation;
  activeLocationIndex: number;
  locationCount: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function HomeOverlay({
  activeLocation,
  activeLocationIndex,
  locationCount,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
}: HomeOverlayProps) {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-start pt-[12vh]">
      <div className="pointer-events-auto w-[min(92vw,560px)] rounded-md border border-white/20 bg-black/55 p-4 text-white shadow-lg backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-white/60">Phase B Navigation Debug</p>
        <h2 className="mt-2 text-2xl font-semibold">{activeLocation.label}</h2>
        <p className="mt-1 text-sm text-white/80">{activeLocation.description}</p>
        <p className="mt-2 text-xs text-white/60">
          Location {activeLocationIndex + 1} of {locationCount}
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="rounded border border-white/30 px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canGoNext}
            className="rounded border border-white/30 px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
