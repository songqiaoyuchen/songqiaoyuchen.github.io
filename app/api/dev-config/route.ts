import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

// Round float noise (0.060000000000000005 → 0.06) without clipping precision
// anyone actually tunes at.
function formatNumber(v: number): string {
  return String(Math.round(v * 1e6) / 1e6);
}

function toLiteral(value: unknown): string | null {
  if (typeof value === 'string') return `'${value.replace(/'/g, '')}'`;
  if (typeof value === 'number' && Number.isFinite(value)) return formatNumber(value);
  if (typeof value === 'boolean') return String(value);
  if (Array.isArray(value) && value.every((n) => typeof n === 'number' && Number.isFinite(n))) {
    return `[${value.map(formatNumber).join(', ')}]`;
  }
  return null;
}

const LITERAL = "\\[[^\\]]*\\]|'[^']*'|-?\\d[\\d.]*(?:e-?\\d+)?|true|false";

function replaceKey(src: string, key: string, literal: string): string | null {
  const re = new RegExp(`(\\b${key}:\\s*)(${LITERAL})`);
  if (!re.test(src)) return null;
  return src.replace(re, `$1${literal}`);
}

// "block.key" scoping for keys that aren't unique file-wide (e.g. `position`
// exists under both camera and mesh): replace only inside `block: { ... }`.
function replaceScopedKey(src: string, block: string, key: string, literal: string): string | null {
  const blockStart = src.search(new RegExp(`\\b${block}:\\s*\\{`));
  if (blockStart < 0) return null;
  let depth = 0;
  let end = -1;
  for (let i = src.indexOf('{', blockStart); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) { end = i; break; }
  }
  if (end < 0) return null;
  const replaced = replaceKey(src.slice(blockStart, end), key, literal);
  if (replaced === null) return null;
  return src.slice(0, blockStart) + replaced + src.slice(end);
}

/**
 * Dev-only: writes values back into config/terrain.ts in place, one targeted
 * regex per key, so hand-written comments and formatting survive. Keys may be
 * flat (`minorRadius` — must be unique across the file) or block-scoped
 * (`camera.position`). Unknown keys are reported back as `missed` instead of
 * failing the save.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'dev only' }, { status: 403 });
  }

  const { values } = (await request.json()) as { values: Record<string, unknown> };
  if (!values || typeof values !== 'object') {
    return NextResponse.json({ error: 'missing values' }, { status: 400 });
  }

  const file = path.join(process.cwd(), 'config', 'terrain.ts');
  let src = await fs.readFile(file, 'utf8');

  const missed: string[] = [];
  let saved = 0;
  for (const [rawKey, value] of Object.entries(values)) {
    const literal = toLiteral(value);
    const parts = rawKey.split('.');
    const valid = parts.length <= 2 && parts.every((p) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(p));
    const next = !literal || !valid ? null
      : parts.length === 2 ? replaceScopedKey(src, parts[0], parts[1], literal)
      : replaceKey(src, rawKey, literal);
    if (next === null) missed.push(rawKey);
    else { src = next; saved++; }
  }

  await fs.writeFile(file, src, 'utf8');
  return NextResponse.json({ saved, missed });
}
