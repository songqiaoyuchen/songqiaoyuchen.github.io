// The crack's walls from the bake (lib/scene/lakeBake.ts, scripts/bake/bake-lake.mjs): fetched once the page is
// idle, then laid out (radii, positions, normals, triangles) in slices of idle time, so no frame waits on them.
// Null until ready. A bake that no longer matches the walls (a development change not yet rebaked) is left aside
// with a warning and the radii are sampled here instead, more slowly.
'use client';

import {useEffect, useState} from 'react';
import {BufferAttribute, BufferGeometry} from 'three';
import type {CrackRoute} from '@/lib/scene/lake';
import {decodeCrackRadii, LAKE_BAKE_DIRECTORY, type LakeBakeManifest} from '@/lib/scene/lakeBake';

type Deadline = {timeRemaining: () => number};

// A phone busy drawing every frame rarely goes idle: its slices come at the timeout with no idle time left, so
// each still does a little work, and the timeout is short enough that the walls are built within seconds.
const MIN_SLICE_MS = 4;
const IDLE_TIMEOUT_MS = 200;

function idle() {
  return new Promise<Deadline>((resolve) => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(resolve, {timeout: IDLE_TIMEOUT_MS});
    else {
      setTimeout(() => {
        const start = performance.now();
        resolve({timeRemaining: () => Math.max(0, 8 - (performance.now() - start))});
      }, 16);
    }
  });
}

/** Runs step(i) for i in [0, count) across idle slices. */
async function inSlices(count: number, step: (i: number) => void, cancelled: () => boolean) {
  let i = 0;
  while (i < count) {
    const deadline = await idle();
    if (cancelled()) return;
    const start = performance.now();
    do step(i++);
    while (i < count && (deadline.timeRemaining() > 2 || performance.now() - start < MIN_SLICE_MS));
  }
}

async function loadBake(route: CrackRoute, ring: number) {
  try {
    const manifest = await (await fetch(`${LAKE_BAKE_DIRECTORY}/manifest.json`, {cache: 'no-cache'}))
      .json() as LakeBakeManifest;
    if (manifest.format !== 'crack-delta-v1' || manifest.stations !== route.stations.length
      || manifest.ring !== ring) return null;
    const response = await fetch(`${LAKE_BAKE_DIRECTORY}/${manifest.file}`, {cache: 'force-cache'});
    const stream = response.ok ? response.body?.pipeThrough(new DecompressionStream('gzip')) : undefined;
    if (!stream) return null;
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    return bytes.byteLength === manifest.byteLength ? {manifest, bytes} : null;
  } catch {
    return null;
  }
}

export function useCrackGeometry(route: CrackRoute) {
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);

  useEffect(() => {
    let cancelled = false;
    let built: BufferGeometry | null = null;
    const isCancelled = () => cancelled;
    (async () => {
      await idle();
      const angles = route.ringAngles();
      const ring = angles.length;
      const stations = route.stations.length;
      const bake = await loadBake(route, ring);
      if (cancelled) return;
      const positions = new Float32Array(stations * ring * 3);
      const normals = new Float32Array(positions.length);
      let laid = false;
      if (bake) {
        const steps = new Uint16Array(stations * ring);
        const {step} = bake.manifest;
        await inSlices(stations, (i) => {
          decodeCrackRadii(bake.bytes, ring, steps, i, i + 1);
          route.layPositions(steps, step, angles, positions, i, i + 1);
        }, isCancelled);
        // A few points against the walls' own code: a stale bake would put the walls where the craft is not.
        laid = true;
        for (let i = 0; i < stations; i += Math.floor(stations / 8)) {
          const j = (i * 37) % ring;
          if (Math.abs(steps[i * ring + j] * step - route.radius(angles[j], route.stations[i].s)) > step * 2) {
            laid = false;
          }
        }
      }
      if (cancelled) return;
      if (!laid) {
        console.warn('The lake bake is missing or stale: run `npm run bake:lake`. Sampling the walls instead.');
        const sampled = new Float32Array(stations * ring);
        await inSlices(stations, (i) => {
          for (let j = 0; j < ring; j++) sampled[i * ring + j] = route.radius(angles[j], route.stations[i].s);
          route.layPositions(sampled, 1, angles, positions, i, i + 1);
        }, isCancelled);
      }
      await inSlices(stations, (i) => route.layNormals(positions, normals, ring, i, i + 1), isCancelled);
      if (cancelled) return;
      await idle();
      if (cancelled) return;
      built = new BufferGeometry();
      built.setAttribute('position', new BufferAttribute(positions, 3));
      built.setAttribute('normal', new BufferAttribute(normals, 3));
      built.setIndex(new BufferAttribute(route.layIndices(ring), 1));
      setGeometry(built);
    })();
    return () => {
      cancelled = true;
      built?.dispose();
    };
  }, [route]);

  return geometry;
}
