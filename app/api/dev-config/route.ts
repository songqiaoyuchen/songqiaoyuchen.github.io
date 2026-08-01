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

const EDITABLE_CONFIG = {
  camera: {
    directory: 'scene',
    fileName: 'camera.ts',
    keys: [
      'overviewPosition', 'overviewLookAt',
      'projectsPosition', 'projectsLookAt',
      'artPosition', 'artLookAt',
      'blogPosition', 'blogLookAt',
      'aboutPosition', 'aboutLookAt',
      'fov',
    ],
  },
  contours: {
    directory: 'scene',
    fileName: 'contours.ts',
    keys: [
      'levels', 'smoothIterations', 'chaikinIterations', 'resampleSpacing',
      'spacingJitter', 'shadowChance', 'shadowOffset', 'shadowIntensity',
      'lift', 'depthBias', 'majorEvery', 'majorMinHeight', 'minorRadius',
      'majorRadius', 'minorColor', 'minorIntensity', 'minorBase', 'majorColor',
      'majorIntensity', 'pulseColor', 'pulseTint', 'pulseSpeed', 'pulseScale',
      'pulseSharpness',
    ],
  },
  fog: {
    directory: 'scene',
    fileName: 'fog.ts',
    keys: ['near', 'far'],
  },
  postProcessing: {
    directory: 'scene',
    fileName: 'postProcessing.ts',
    keys: ['bloomIntensity', 'bloomThreshold', 'bloomSmoothing'],
  },
  terrain: {
    directory: 'scene',
    fileName: 'terrain.ts',
    keys: [
      'elevation', 'seaLevel', 'baseColor', 'ridgeColor', 'shadowStrength',
      'shadowBias', 'lightColor', 'lightX', 'lightY', 'lightZ', 'lightIntensity',
      'lightFalloff', 'light2Color', 'light2X', 'light2Y', 'light2Z',
      'light2Intensity', 'light2Falloff',
    ],
  },
  linkStreams: {
    directory: 'navigation',
    fileName: 'linkStreams.ts',
    keys: ['mobileStartX', 'mobileEndX', 'mobileCenterY'],
  },
} as const;

type ConfigScope = keyof typeof EDITABLE_CONFIG;

function isConfigScope(value: string): value is ConfigScope {
  return value in EDITABLE_CONFIG;
}

type ConfigSource = {
  filePath: string;
  source: string;
  changed: boolean;
};

/**
 * Dev-only: writes values back into the focused files under config/scene.
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
      const {directory, fileName} = EDITABLE_CONFIG[scope];
      const filePath = path.join(process.cwd(), 'config', directory, fileName);
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
