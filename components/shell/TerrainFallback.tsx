// Static CSS contour backdrop shown when WebGL fails or the visitor skips the terrain (TerrainFallback.css).
export function TerrainFallback() {
  return <div aria-hidden="true" className="terrain-static-fallback" />;
}
