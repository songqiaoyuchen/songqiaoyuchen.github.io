const ARTWORKS = ['Field study', 'Night passage', 'Topography', 'Elsewhere'];

type Props = {
  compact?: boolean;
};

export function ArtworkCards({ compact = false }: Props) {
  return (
    <div
      className={`grid w-[min(1120px,88vw)] grid-cols-2 gap-3 md:grid-cols-4 md:gap-5 ${
        compact ? 'pointer-events-none' : 'pointer-events-auto'
      }`}
    >
      {ARTWORKS.map((title, index) => (
        <article key={title} className="group">
          <div className="aspect-[4/3] border border-white/20 bg-[#f3f0e9] shadow-[0_12px_36px_rgba(0,0,0,.24)] transition-transform duration-300 group-hover:-translate-y-1" />
          {!compact ? (
            <div className="mt-2.5 flex items-baseline justify-between gap-3 font-mono uppercase">
              <h3 className="text-[9px] tracking-[0.12em] text-muted md:text-[10px]">
                {title}
              </h3>
              <span className="text-[8px] tracking-[0.18em] text-dim">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
