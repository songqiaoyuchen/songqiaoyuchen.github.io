// Dev-only POST endpoint behind the Leva save buttons: rewrites allowlisted literals in config files.
// Deleted before static export (.github/workflows/nextjs.yml), so it never ships.
import {promises as fs} from 'fs';
import path from 'path';
import {NextResponse} from 'next/server';
import {EDITABLE_CONFIG, isConfigScope, type ConfigScope} from './editableConfig';
import {replaceKey, toLiteral} from './literals';

type ConfigSource = {
  filePath: string;
  source: string;
  changed: boolean;
};

/**
 * Dev-only: writes values back into the focused files under config/.
 * Values use explicit `scope.key` paths. Both scopes and keys are allowlisted,
 * so unrelated Leva controls can never be written into source files.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({error: 'dev only'}, {status: 403});
  }

  const {values} = (await request.json()) as {values: Record<string, unknown>};
  if (!values || typeof values !== 'object') {
    return NextResponse.json({error: 'missing values'}, {status: 400});
  }

  const scopes = Object.keys(EDITABLE_CONFIG) as ConfigScope[];
  const sourceEntries = await Promise.all(
    scopes.map(async (scope) => {
      const filePath = path.join(process.cwd(), 'config', EDITABLE_CONFIG[scope].file);
      return [scope, {
        filePath,
        source: await fs.readFile(filePath, 'utf8'),
        changed: false,
      }] as const;
    }),
  );
  const sources = new Map<ConfigScope, ConfigSource>(sourceEntries);

  const missed: string[] = [];
  let saved = 0;

  for (const [rawKey, value] of Object.entries(values)) {
    const literal = toLiteral(value);
    const parts = rawKey.split('.');
    if (
      !literal
      || parts.length !== 2
      || !parts.every((part) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(part))
    ) {
      missed.push(rawKey);
      continue;
    }

    const [scope, key] = parts;
    if (!isConfigScope(scope) || !EDITABLE_CONFIG[scope].keys.some((entry) => entry === key)) {
      missed.push(rawKey);
      continue;
    }

    const target = sources.get(scope);
    if (!target) {
      missed.push(rawKey);
      continue;
    }

    const next = replaceKey(target.source, key, literal);
    if (next === null) {
      missed.push(rawKey);
      continue;
    }

    target.source = next;
    target.changed = true;
    saved++;
  }

  await Promise.all(
    [...sources.values()]
      .filter((source) => source.changed)
      .map((source) => fs.writeFile(source.filePath, source.source, 'utf8')),
  );

  return NextResponse.json({saved, missed});
}
