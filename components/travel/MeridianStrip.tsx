// The trip index's meridian strip: the globe's turn laid flat, as a small world map. Longitude runs along it and
// latitude up it (north at the top), every trip a diamond at its place. The half of the Earth facing the camera is
// shaded (north or south as much as east or west, so a trip at the right longitude but over the pole reads as hidden)
// and a crosshair marks the globe's centre, both following the globe every frame (TravelGlobe writes the place it
// faces). The trips the globe faces
// away from are reported back so the list can dim them.
'use client';

import {useEffect, useRef, type MutableRefObject} from 'react';
import {angularDistance} from '@/lib/scene/travel';
import type {Trip} from '@/data/travel';
import type {GlobeFront} from './TravelSceneContext';

const TICK_STEP = 15; // degrees
const PAD_TOP = 4;
const TICKS_HEIGHT = 16;
const TICKS_GAP = 4;
const COLUMN = 2; // CSS pixels per column of the facing half
const DEG = Math.PI / 180;

type MeridianStripProps = {
  trips: readonly Trip[];
  globeFront: MutableRefObject<GlobeFront | null>;
  hoveredId: string | null;
  capturedId: string | null;
  /** Called when the set of trips on the far side changes. */
  onFar: (far: ReadonlySet<string>) => void;
};

export function MeridianStrip({trips, globeFront, hoveredId, capturedId, onFar}: MeridianStripProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The latest props for the frame loop, which runs once per mount.
  const live = useRef({hoveredId, capturedId, onFar});
  useEffect(() => {
    live.current = {hoveredId, capturedId, onFar};
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const style = getComputedStyle(canvas);
    const signal = style.getPropertyValue('--travel-signal').trim() || '#8fe3d6';
    const ink = style.getPropertyValue('--color-panel').trim() || '#080a0d';
    let width = 0;
    let height = 0;
    let drawn = '';
    let far = '';
    let frame = 0;
    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawn = '';
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const x = (lon: number) => (lon + 180) / 360 * width;
    // The map: latitude 90 to -90 above the longitude ticks.
    const mapBottom = () => height - TICKS_HEIGHT - TICKS_GAP;
    const y = (lat: number) => PAD_TOP + (90 - lat) / 180 * (mapBottom() - PAD_TOP);

    const draw = () => {
      frame = requestAnimationFrame(draw);
      const front = globeFront.current;
      const {hoveredId: hovered, capturedId: captured} = live.current;
      const key = `${front ? `${front.lon.toFixed(2)},${front.lat.toFixed(2)}` : '-'}|${hovered}|${captured}|${width}`;
      if (key === drawn) return;
      drawn = key;

      context.clearRect(0, 0, width, height);
      const top = PAD_TOP;
      const bottom = mapBottom();
      if (front) {
        // The facing half: in each column, the latitudes whose angle from the front is under 90 degrees, above or
        // below the great circle sin(lat) sin(lat0) + cos(lat) cos(lat0) cos(dLon) = 0.
        context.fillStyle = signal;
        context.globalAlpha = 0.1;
        const sinLat = Math.sin(front.lat * DEG);
        const cosLat = Math.cos(front.lat * DEG);
        for (let px = 0; px < width; px += COLUMN) {
          const along = cosLat * Math.cos(((px + COLUMN / 2) / width * 360 - 180 - front.lon) * DEG);
          let from = top;
          let to = bottom;
          if (Math.abs(sinLat) < 1e-4) {
            if (along <= 0) continue;
          } else {
            const edge = y(Math.atan(-along / sinLat) / DEG);
            if (sinLat > 0) to = edge;
            else from = edge;
          }
          context.fillRect(px, from, COLUMN, to - from);
        }
        context.globalAlpha = 1;
      }
      // The equator, faint.
      context.fillStyle = 'rgb(242 238 230 / 14%)';
      context.fillRect(0, Math.round(y(0)), width, 1);
      for (let lon = -180; lon <= 180; lon += TICK_STEP) {
        const major = lon % 90 === 0;
        context.fillStyle = major ? 'rgb(242 238 230 / 38%)' : 'rgb(242 238 230 / 14%)';
        const length = major ? TICKS_HEIGHT : TICKS_HEIGHT / 2;
        context.fillRect(Math.round(x(lon)) - (lon === 180 ? 1 : 0), height - length, 1, length);
      }
      if (front) {
        // The crosshair at the globe's centre.
        context.fillStyle = signal;
        context.globalAlpha = 0.5;
        context.fillRect(0, Math.round(y(front.lat)), width, 1);
        context.globalAlpha = 1;
        context.fillRect(Math.round(x(front.lon)), top, 1, bottom - top);
      }
      trips.forEach((trip) => {
        const lit = trip.id === hovered || trip.id === captured;
        const [lon, lat] = trip.place.lonLat;
        const size = lit ? 7 : 5;
        context.save();
        context.translate(Math.round(x(lon)) + 0.5, Math.round(y(lat)) + 0.5);
        context.rotate(Math.PI / 4);
        context.fillStyle = lit ? signal : ink;
        context.strokeStyle = signal;
        context.lineWidth = 1;
        context.fillRect(-size / 2, -size / 2, size, size);
        context.strokeRect(-size / 2, -size / 2, size, size);
        context.restore();
      });

      // The trips the globe faces away from.
      const away = front
        ? trips.filter((trip) => angularDistance(trip.place.lonLat, [front.lon, front.lat]) > 90).map((trip) => trip.id)
        : [];
      const awayKey = away.join(',');
      if (awayKey !== far) {
        far = awayKey;
        live.current.onFar(new Set(away));
      }
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [globeFront, trips]);

  return (
    <div className="travel-strip">
      <div className="travel-strip-map">
        <canvas aria-hidden="true" ref={canvasRef} />
        <span aria-hidden="true" className="travel-strip-pole" data-pole="north">N</span>
        <span aria-hidden="true" className="travel-strip-pole" data-pole="south">S</span>
      </div>
      <div aria-hidden="true" className="travel-strip-scale">
        <span>180° W</span>
        <span>0°</span>
        <span>180° E</span>
      </div>
    </div>
  );
}
