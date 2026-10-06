// Client helper that posts Leva values to the dev-only config writer (app/api/dev-config).
/**
 * POST values to the dev-only config writer (app/api/dev-config). Keys are
 * explicitly scoped scene keys such as `contours.minorRadius` or
 * `camera.overviewPosition`, `camera.mobileOverviewPosition`, or
 * `camera.projectsLookAt`.
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
    console.log(`[config] ${label}: saved ${result.saved} values${missed}`);
    return !result.missed?.length && result.saved === Object.keys(values).length;
  } catch (error) {
    console.error(`[config] ${label} failed:`, error);
    return false;
  }
}
