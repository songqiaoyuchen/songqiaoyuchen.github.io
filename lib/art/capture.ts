// Art Screenshot mode (dev only): default capture settings, export types and the file download.
export const CAPTURE_DEFAULTS = {
  enabled: false,
  source: 0, // BackdropId: terrain, oil, pencil, digital
  exposure: 2,
  contrast: 1,
  saturation: 1,
  width: 2048,
};

export type ArtCaptureSettings = typeof CAPTURE_DEFAULTS;
export type ArtCaptureExport = (kind: 'png' | 'settings') => Promise<void>;

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
