// Screenshot mode exporter (dev only): reads the finished composer frame to PNG or settings JSON.
'use client';

import {useEffect, useRef} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import {PerspectiveCamera, Vector2} from 'three';
import {useArtCapture} from '@/components/art/ArtSceneContext';
import {downloadBlob} from '@/lib/art/capture';

/** Mounted only alongside the composer; read the completed frame before its buffer is cleared. */
export function CaptureExport() {
  const {capture, exportCapture} = useArtCapture();
  const setDpr = useThree((state) => state.setDpr);
  const width = useThree((state) => state.size.width);
  const initialDpr = useThree((state) => state.viewport.initialDpr);
  const pending = useRef<{kind: 'png' | 'settings'; resolve: () => void; reject: (error: Error) => void} | null>(null);
  const frames = useRef(0);

  useEffect(() => {
    setDpr(capture.width / width);
    frames.current = 0;
    exportCapture.current = (kind) => new Promise<void>((resolve, reject) => {
      pending.current = {kind, resolve, reject};
    });
    return () => {
      exportCapture.current = null;
      pending.current?.reject(new Error('Capture cancelled.'));
      pending.current = null;
    };
  }, [capture, exportCapture, setDpr, width]);

  useEffect(() => () => setDpr(initialDpr), [initialDpr, setDpr]);

  useFrame(({gl, camera, scene}) => {
    if (++frames.current < 3 || !pending.current) return;
    const request = pending.current;
    pending.current = null;
    let ready = false;
    scene.traverse((object) => {
      if (!('material' in object)) return;
      const material = object.material as {uniforms?: Record<string, {value: unknown}>};
      ready ||= material.uniforms?.uCaptureReady?.value === 1;
    });
    if (!ready) {
      request.reject(new Error('Source is still loading or the camera is arriving. Please retry.'));
      return;
    }
    const size = gl.getDrawingBufferSize(new Vector2());
    const name = `art-${['terrain', 'oil', 'pencil', 'digital'][capture.source]}-${size.x}x${size.y}`;
    try {
      if (request.kind === 'settings') {
        const settings = {capture, pixels: size.toArray(), camera: {position: camera.position.toArray(),
          quaternion: camera.quaternion.toArray(),
          fov: camera instanceof PerspectiveCamera ? camera.fov : null,
          aspect: camera instanceof PerspectiveCamera ? camera.aspect : null}};
        downloadBlob(new Blob([JSON.stringify(settings, null, 2)], {type: 'application/json'}), `${name}.json`);
        request.resolve();
      } else {
        gl.domElement.toBlob((blob) => {
          if (!blob) { request.reject(new Error('PNG export failed. Try the smaller size.')); return; }
          downloadBlob(blob, `${name}.png`);
          request.resolve();
        }, 'image/png');
      }
    } catch (error) { request.reject(error instanceof Error ? error : new Error('Capture failed.')); }
  }, 2);
  return null;
}
