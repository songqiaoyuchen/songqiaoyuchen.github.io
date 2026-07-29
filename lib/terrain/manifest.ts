export type TerrainArtifact = {
  byteLength: number;
  channels: number;
  compressedByteLength: number;
  file: string;
  format: 'f32' | 'r16f' | 'rg16f';
  height: number;
  width: number;
};

export type TerrainManifest = {
  artifacts: {
    displacement: TerrainArtifact;
    gradient: TerrainArtifact;
    shell: TerrainArtifact;
    staticLighting: TerrainArtifact;
  };
  configHash: string;
  sourceHash: string;
  version: 1;
};

const MANIFEST_URL = '/textures/terrain/baked/manifest.json';
let manifestPromise: Promise<TerrainManifest> | null = null;

export function loadTerrainManifest() {
  manifestPromise ??= fetch(MANIFEST_URL, {cache: 'no-cache'}).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Unable to load terrain manifest (${response.status}).`);
    }
    const manifest = await response.json() as TerrainManifest;
    if (manifest.version !== 1) throw new Error('Unsupported terrain manifest version.');
    return manifest;
  });
  return manifestPromise;
}

export function preloadTerrainManifest() {
  void loadTerrainManifest();
}
