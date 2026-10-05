'use client';

import {useEffect, useState} from 'react';
import {button, useControls, type useCreateStore} from 'leva';
import {artCursorSettings} from '@/lib/scene/artCursorSettings';
import {postConfigValues} from '@/lib/debug/saveConfig';

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
    touchRadius: slider('touchRadius', 'Light radius (px)', 20, 240, 2),
    healSeconds: slider('healSeconds', 'Light heal (s)', 0.2, 6, 0.1),
    smudgeDrag: slider('smudgeDrag', 'Oil smudge', 0, 1, 0.01),
    smudgeHealSeconds: slider('smudgeHealSeconds', 'Oil heal (s)', 0.2, 10, 0.1),
    pencilStrength: slider('pencilStrength', 'Pencil hatch', 0, 1, 0.05),
    dotsStrength: slider('dotsStrength', 'Digital light', 0, 1, 0.05),
    'Save cursor': button(async () => {
      setStatus('Saving...');
      const saved = await postConfigValues('Save Art cursor', Object.fromEntries(
        Object.entries(artCursorSettings).map(([key, value]) => [`artCursor.${key}`, value])));
      setStatus(saved ? 'Saved to config' : 'Save failed; retry');
    }),
    status: {value: 'Not saved', label: 'Status', editable: false},
  }), {collapsed: false}, {store}, []);

  useEffect(() => set({status}), [set, status]);

  return null;
}
