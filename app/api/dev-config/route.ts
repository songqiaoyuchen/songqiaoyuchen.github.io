import {promises as fs} from 'fs';
import path from 'path';
import {NextResponse} from 'next/server';

// Round float noise (0.060000000000000005 -> 0.06) without clipping
// precision anyone actually tunes at.
function formatNumber(value: number): string {
  return String(Math.round(value * 1e6) / 1e6);
}

function toLiteral(value: unknown): string | null {
  if (typeof value === 'string') return `'${value.replace(/'/g, '')}'`;
  if (typeof value === 'number' && Number.isFinite(value)) return formatNumber(value);
  if (typeof value === 'boolean') return String(value);
  if (
    Array.isArray(value)
    && value.every((item) => typeof item === 'number' && Number.isFinite(item))
  ) {
    return `[${value.map(formatNumber).join(', ')}]`;
  }
  return null;
}

const LITERAL = "\\[[^\\]]*\\]|'[^']*'|-?\\d[\\d.]*(?:e-?\\d+)?|true|false";

function replaceKey(source: string, key: string, literal: string): string | null {
  const pattern = new RegExp(`(\\b${key}:\\s*)(${LITERAL})`);
  if (!pattern.test(source)) return null;
  return source.replace(pattern, `$1${literal}`);
}

const EDITABLE_CONFIG_FILES = [
  'camera.ts',
  'contours.ts',
  'fog.ts',
  'postProcessing.ts',
  'terrain.ts',
] as const;

const SCOPED_CONFIG_FILES: Record<string, string> = {
  camera: 'camera.ts',
};

type ConfigSource = {
  fileName: string;
  filePath: string;
  source: string;
  changed: boolean;
};

/**
 * Dev-only: writes values back into the focused files under config/scene.
 * Each flat key must occur in exactly one editable file. Scoped camera keys
 * (`camera.position`) are routed directly to camera.ts. Unknown or ambiguous
 * keys are reported as `missed` instead of failing the save.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({error: 'dev only'}, {status: 403});
  }

  const {values} = (await request.json()) as {values: Record<string, unknown>};
  if (!values || typeof values !== 'object') {
    return NextResponse.json({error: 'missing values'}, {status: 400});
  }

  const configDirectory = path.join(process.cwd(), 'config', 'scene');
  const sources: ConfigSource[] = await Promise.all(
    EDITABLE_CONFIG_FILES.map(async (fileName) => {
      const filePath = path.join(configDirectory, fileName);
      return {
        fileName,
        filePath,
        source: await fs.readFile(filePath, 'utf8'),
        changed: false,
      };
    }),
  );

  const missed: string[] = [];
  let saved = 0;

  for (const [rawKey, value] of Object.entries(values)) {
    const literal = toLiteral(value);
    const parts = rawKey.split('.');
    const valid = parts.length <= 2 && parts.every((part) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(part));
    if (!literal || !valid) {
      missed.push(rawKey);
      continue;
    }

    const [scopeOrKey, scopedKey] = parts;
    const candidates = scopedKey
      ? sources.filter((source) => source.fileName === SCOPED_CONFIG_FILES[scopeOrKey])
      : sources.filter((source) => replaceKey(source.source, scopeOrKey, literal) !== null);

    if (candidates.length !== 1) {
      missed.push(rawKey);
      continue;
    }

    const target = candidates[0];
    const next = replaceKey(target.source, scopedKey ?? scopeOrKey, literal);
    if (next === null) {
      missed.push(rawKey);
      continue;
    }

    target.source = next;
    target.changed = true;
    saved++;
  }

  await Promise.all(
    sources
      .filter((source) => source.changed)
      .map((source) => fs.writeFile(source.filePath, source.source, 'utf8')),
  );

  return NextResponse.json({saved, missed});
}
