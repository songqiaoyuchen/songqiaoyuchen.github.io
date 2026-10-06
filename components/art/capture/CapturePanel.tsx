// Screenshot mode panel (dev only): frames the bare scene at 2:1, tunes exposure and exports PNG/settings.
// While enabled, body[data-art-capture] hides the gallery and nav (CapturePanel.css).
'use client';

import {useEffect, useRef, useState} from 'react';
import {CAPTURE_DEFAULTS} from '@/lib/art/capture';
import {useArtScene} from '../ArtSceneContext';

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function CapturePanel() {
  const {capture, setCapture, exportCapture} = useArtScene();
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!capture.enabled) return;
    document.body.dataset.artCapture = 'true';
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setHidden(false);
        requestAnimationFrame(() => panel.current?.focus());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      delete document.body.dataset.artCapture;
      window.removeEventListener('keydown', onKey);
    };
  }, [capture.enabled]);

  useEffect(() => {
    if (!hidden || !capture.enabled) return;
    const restore = () => {
      setHidden(false);
      requestAnimationFrame(() => panel.current?.focus());
    };
    window.addEventListener('pointerdown', restore, {once: true});
    return () => window.removeEventListener('pointerdown', restore);
  }, [hidden, capture.enabled]);

  useEffect(() => () => setCapture((current) => ({...current, enabled: false})), [setCapture]);

  async function save(kind: 'png' | 'settings') {
    setBusy(true);
    setStatus('');
    try {
      if (!exportCapture.current) throw new Error('The terrain is still preparing. Please try again shortly.');
      await exportCapture.current(kind);
      setStatus(kind === 'png' ? 'PNG downloaded.' : 'Capture settings downloaded.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not export this frame. Please retry.');
    } finally { setBusy(false); }
  }

  if (!capture.enabled) return (
    <button ref={trigger} type="button" className="art-text-link art-capture-open"
      onClick={() => { setHidden(false); setStatus(''); setCapture({...CAPTURE_DEFAULTS, enabled: true}); }}>
      Screenshot mode
    </button>
  );

  return (
    <div className="art-capture-panel" ref={panel} tabIndex={-1} hidden={hidden}
      role="region" aria-label="Screenshot controls">
      <div className="flex items-center justify-between gap-4">
        <strong>Scene capture</strong>
        <button type="button" onClick={() => {
          setCapture((current) => ({...current, enabled: false}));
          requestAnimationFrame(() => trigger.current?.focus());
        }}>Close</button>
      </div>
      <p>Clean 2:1 frame. Adjust the source, then export it for your image model.</p>
      <label>Source
        <select value={capture.source} disabled={busy}
          onChange={(event) => setCapture({...capture, source: Number(event.target.value)})}>
          <option value={0}>Realistic terrain</option><option value={1}>Oil</option>
          <option value={2}>Pencil</option><option value={3}>Digital</option>
        </select>
      </label>
      {([
        ['exposure', 'Exposure (stops)', -2, 6, .1],
        ['contrast', 'Contrast', .5, 1.8, .05],
        ['saturation', 'Saturation', 0, 2, .05],
      ] as const).map(([key, label, min, max, step]) => (
        <label key={key}>{label} <output>{capture[key].toFixed(2)}</output>
          <input type="range" min={min} max={max} step={step} value={capture[key]} disabled={busy}
            onChange={(event) => setCapture({...capture, [key]: Number(event.target.value)})} />
        </label>
      ))}
      <label>PNG size
        <select value={capture.width} disabled={busy}
          onChange={(event) => setCapture({...capture, width: Number(event.target.value)})}>
          <option value={2048}>2048 × 1024</option><option value={4096}>4096 × 2048</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={() => void save('png')}>Download PNG</button>
        <button type="button" disabled={busy} onClick={() => void save('settings')}>Save settings</button>
        <button type="button" disabled={busy} onClick={() => setCapture({...CAPTURE_DEFAULTS, enabled: true})}>
          Reset
        </button>
        <button type="button" disabled={busy} onClick={() => setHidden(true)}>
          Hide controls (Esc or tap to restore)
        </button>
      </div>
      <p>PNG exports exclude controls. Exposure 0, contrast 1 and saturation 1 preserve the source colors.</p>
      <div className="flex flex-wrap gap-4">
        <a href={`${base}/art-prompts/pencil.txt`} download>Pencil prompt ↓</a>
        <a href={`${base}/art-prompts/oil.txt`} download>Oil prompt ↓</a>
        <a href={`${base}/art-prompts/digital.txt`} download>Digital prompt ↓</a>
        <a href={`${base}/art-prompts/README.txt`} target="_blank" rel="noreferrer">Capture guide ↗</a>
      </div>
      <p role="status">{busy ? 'Exporting…' : status}</p>
    </div>
  );
}
