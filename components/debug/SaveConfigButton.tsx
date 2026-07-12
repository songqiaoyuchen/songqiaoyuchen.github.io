'use client';

import { button, levaStore, useControls } from 'leva';
import { postConfigValues } from '@/lib/debug/saveConfig';

/**
 * "Save Config" Leva button: snapshots every current control value (all
 * folders) and writes it back into config/terrain.ts, so a tuning session
 * becomes the new default look with one click.
 *
 * Camera settings are untouched by construction: only scalar Leva control
 * values are sent, under their flat leaf keys — the camera block is written
 * exclusively by Save Camera (CameraLogger) via `camera.`-scoped keys.
 */
function collectLevaValues(): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [dataPath, entry] of Object.entries(levaStore.getData())) {
    if (!('value' in entry)) continue; // buttons, folders
    const { value } = entry;
    const t = typeof value;
    if (t !== 'string' && t !== 'number' && t !== 'boolean') continue;
    values[dataPath.split('.').pop()!] = value;
  }
  return values;
}

export function SaveConfigButton() {
  useControls('Config', {
    'Save Config': button(() => void postConfigValues('Save Config', collectLevaValues())),
  });
  return null;
}
