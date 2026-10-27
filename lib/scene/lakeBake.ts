// The baked crack (scripts/bake/bake-lake.mjs, public/lake/baked/): the wall's radius at every station and ring
// angle in steps of `step` units, each stored as its change from the same angle at the station before (the walls
// change little from one station to the next), low bytes then high bytes, so gzip finds the runs.

export type LakeBakeManifest = {
  byteLength: number;
  compressedByteLength: number;
  file: string;
  format: 'crack-delta-v1';
  ring: number;
  stations: number;
  step: number;
};

export const LAKE_BAKE_DIRECTORY = '/lake/baked';

export function encodeCrackRadii(steps: Uint16Array, ring: number) {
  const bytes = new Uint8Array(steps.length * 2);
  for (let k = 0; k < steps.length; k++) {
    const delta = k >= ring ? (steps[k] - steps[k - ring]) & 0xffff : steps[k];
    bytes[k] = delta & 0xff;
    bytes[steps.length + k] = delta >> 8;
  }
  return bytes;
}

/** Decodes stations [from, to) into `steps` (the stations before `from` must be decoded already). */
export function decodeCrackRadii(
  bytes: Uint8Array, ring: number, steps: Uint16Array, from = 0, to = steps.length / ring,
) {
  const count = steps.length;
  for (let k = from * ring; k < to * ring; k++) {
    const delta = bytes[k] | (bytes[count + k] << 8);
    steps[k] = k >= ring ? (steps[k - ring] + delta) & 0xffff : delta;
  }
}
