// Leva "Art Cursor" folder (dev only): live cursor tuning, saved to config/art/cursor.ts.
'use client';

import {useEffect, useState} from 'react';
import {button, useControls, type useCreateStore} from 'leva';
import {artCursorSettings} from '@/lib/art/cursorSettings';
import {postConfigValues} from './saveConfig';

function slider(key: keyof typeof artCursorSettings, label: string, min: number, max: number, step: number) {
  return {
    value: artCursorSettings[key], min, max, step, label,
    onChange: (value: number) => {
      artCursorSettings[key] = value;
    },
  };
}

/** Retunes the Art cursor treatments live; values persist across Art visits. */
export function ArtCursorControls({store}: {store: ReturnType<typeof useCreateStore>}) {
  const [status, setStatus] = useState('Not saved');
  const [, set] = useControls('Art Cursor', () => ({
    // lib/art/cursorTouch.ts: radius of the pencil/digital light pool.
    touchRadius: slider('touchRadius', 'Light radius (px)', 20, 240, 2),
    // lib/art/cursorTouch.ts: time for the light trail to fade.
    healSeconds: slider('healSeconds', 'Light heal (s)', 0.2, 6, 0.1),
    // lib/art/cursorSmudge.ts: share of cursor travel the oil paint follows.
    smudgeDrag: slider('smudgeDrag', 'Oil smudge', 0, 1, 0.01),
    // lib/art/cursorSmudge.ts: time for smudged oil paint to settle back.
    smudgeHealSeconds: slider('smudgeHealSeconds', 'Oil heal (s)', 0.2, 10, 0.1),
    // terrainComposite.frag (via useArtCursor): strength of the cursor's pencil cross-hatching.
    pencilStrength: slider('pencilStrength', 'Pencil hatch', 0, 1, 0.05),
    // terrainComposite.frag (via useArtCursor): brightness of the cursor's light on digital dots.
    dotsStrength: slider('dotsStrength', 'Digital light', 0, 1, 0.05),
    // app/api/dev-config: writes the six values above to config/art/cursor.ts.
    'Save cursor': button(async () => {
      setStatus('Saving...');
      const saved = await postConfigValues('Save Art cursor', Object.fromEntries(
        Object.entries(artCursorSettings).map(([key, value]) => [`artCursor.${key}`, value])));
      setStatus(saved ? 'Saved to config' : 'Save failed; retry');
    }),
    // Read-only save feedback.
    status: {value: 'Not saved', label: 'Status', editable: false},
  }), {collapsed: false}, {store}, []);

  useEffect(() => set({status}), [set, status]);

  return null;
}
