/**
 * POST values to the dev-only config writer (app/api/dev-config). Keys are
 * either flat scene keys (`minorRadius`) or scoped camera keys
 * (`camera.position`).
 * Logs the outcome; used by the Leva "Config" buttons.
 */
export async function postConfigValues(label: string, values: Record<string, unknown>) {
  try {
    const response = await fetch('/api/dev-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    });
    const result = (await response.json()) as {
      saved?: number;
      missed?: string[];
      error?: string;
    };
    if (!response.ok) throw new Error(result.error ?? response.statusText);
    const missed = result.missed?.length ? ` (not in config: ${result.missed.join(', ')})` : '';
    console.log(`[config] ${label}: saved ${result.saved} values to config/scene${missed}`);
  } catch (error) {
    console.error(`[config] ${label} failed:`, error);
  }
}
