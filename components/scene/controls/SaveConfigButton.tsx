// Leva "Config > Save Config" button (dev only): writes all scene control values back to config/scene.
'use client';

import {button, useControls} from 'leva';
import {postConfigValues} from './saveConfig';
import type {SceneControlValues} from './useSceneControls';

/**
 * Leva button: snapshots the scene controls (except camera related)
 * and writes them back into their allowlisted config files,
 * so a tuning session becomes the new default look with one click.
 */
function collectConfigValues(groups: SceneControlValues): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [scope, group] of Object.entries(groups)) {
    for (const [key, value] of Object.entries(group)) {
      if (
        Array.isArray(value)
        && value.every((item) => typeof item === 'number' && Number.isFinite(item))
      ) {
        values[`${scope}.${key}`] = value;
        continue;
      }
      const type = typeof value;
      if (type !== 'string' && type !== 'number' && type !== 'boolean') continue;
      values[`${scope}.${key}`] = value;
    }
  }
  return values;
}

export function SaveConfigButton({values}: {values: SceneControlValues}) {
  useControls('Config', {
    // app/api/dev-config: writes each `scope.key` above into its config/scene file.
    'Save Config': button(() => (
      void postConfigValues('Save Config', collectConfigValues(values))
    )),
  });
  return null;
}
