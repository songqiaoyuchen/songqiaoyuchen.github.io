/**
 * POST values to the dev-only config writer (app/api/dev-config). Keys are
 * either flat config keys (`minorRadius`) or block-scoped (`camera.position`).
 * Logs the outcome; used by the Leva "Config" buttons.
 */
export async function postConfigValues(label: string, values: Record<string, unknown>) {
  try {
    const res = await fetch('/api/dev-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    });
    const result = (await res.json()) as { saved?: number; missed?: string[]; error?: string };
    if (!res.ok) throw new Error(result.error ?? res.statusText);
    const missed = result.missed?.length ? ` (not in config: ${result.missed.join(', ')})` : '';
    console.log(`[config] ${label}: saved ${result.saved} values to config/terrain.ts${missed}`);
  } catch (err) {
    console.error(`[config] ${label} failed:`, err);
  }
}
