// Literal rewriting for the dev config writer (route.ts): formats a posted value as source and swaps it into
// `key: <literal>` in a config file. Framework-free so scripts/test can check it.

// Round float noise (0.060000000000000005 -> 0.06) without clipping
// precision anyone actually tunes at.
function formatNumber(value: number): string {
  return String(Math.round(value * 1e6) / 1e6);
}

function isNumberList(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number' && Number.isFinite(item));
}

const PAIRS_PER_LINE = 5;

/** Source for a value: string, number, boolean, number list, or a list of [x, z] pairs (laid out five per line). */
export function toLiteral(value: unknown): string | null {
  if (typeof value === 'string') return `'${value.replace(/'/g, '')}'`;
  if (typeof value === 'number' && Number.isFinite(value)) return formatNumber(value);
  if (typeof value === 'boolean') return String(value);
  if (isNumberList(value)) return `[${value.map(formatNumber).join(', ')}]`;
  if (Array.isArray(value) && value.length > 0 && value.every((item) => isNumberList(item) && item.length === 2)) {
    // Multi-line, indented as a key one level into an object (config/scene/aboutPath.ts waypoints).
    const pairs = value.map((pair: number[]) => `[${pair.map(formatNumber).join(', ')}]`);
    const lines: string[] = [];
    for (let index = 0; index < pairs.length; index += PAIRS_PER_LINE) {
      lines.push(`    ${pairs.slice(index, index + PAIRS_PER_LINE).join(', ')},`);
    }
    return `[\n${lines.join('\n')}\n  ]`;
  }
  return null;
}

// A flat or one-level nested array, a string, a number or a boolean.
const LITERAL = "\\[(?:[^\\[\\]]|\\[[^\\[\\]]*\\])*\\]|'[^']*'|-?\\d[\\d.]*(?:e-?\\d+)?|true|false";

/** Replaces the literal after the first `key:` in `source`, or within `export const <object>` up to the next
 * export when `object` is given; null when the key is not there. */
export function replaceKey(source: string, key: string, literal: string, object?: string): string | null {
  if (object) {
    const start = source.search(new RegExp(`\\bexport const ${object}\\b`));
    if (start < 0) return null;
    const next = source.indexOf('\nexport ', start + 1);
    const end = next < 0 ? source.length : next;
    const replaced = replaceKey(source.slice(start, end), key, literal);
    return replaced === null ? null : source.slice(0, start) + replaced + source.slice(end);
  }
  const pattern = new RegExp(`(\\b${key}:\\s*)(${LITERAL})`);
  if (!pattern.test(source)) return null;
  return source.replace(pattern, (_, prefix: string) => `${prefix}${literal}`);
}
