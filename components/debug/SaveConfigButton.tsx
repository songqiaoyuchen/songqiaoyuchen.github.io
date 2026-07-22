'use client';

import { button, levaStore, useControls } from 'leva';
import { postConfigValues } from '@/lib/debug/saveConfig';

/**
 * Leva button: snapshots control values (except camera related) 
 * and writes it back into config/scene, 
 * so a tuning session becomes the new default look with one click.
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
