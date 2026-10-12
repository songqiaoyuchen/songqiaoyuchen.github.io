// Still-frame detection: a numeric signature of everything a frame draws, so identical frames can be
// skipped. Offscreen renders the signature cannot see (cached terrain, cursor trails) call markFrameChanged.
import type {Camera, Material, Mesh, Scene, ShaderMaterial} from 'three';
import {isDissolved} from './textTransition';

let changed = true;

/** Forces the next frame to draw: call after rendering into a texture the visible scene samples. */
export function markFrameChanged() {
  changed = true;
}

function pushValue(out: number[], value: unknown) {
  if (typeof value === 'number') out.push(value);
  else if (typeof value === 'boolean') out.push(value ? 1 : 0);
  else if (value === null || value === undefined) out.push(-1);
  else if (ArrayBuffer.isView(value)) out.push(...(value as Float32Array));
  else if (Array.isArray(value)) for (const item of value) pushValue(out, item);
  else if (typeof value === 'object') {
    const object = value as Record<string, unknown> & {elements?: ArrayLike<number>};
    if (object.isTexture) out.push(object.id as number, object.version as number);
    else if (object.elements) out.push(...Array.from(object.elements)); // Matrix3/4
    else if (object.isColor) out.push(object.r as number, object.g as number, object.b as number);
    else if (object.isVector2) out.push(object.x as number, object.y as number);
    else if (object.isVector3) out.push(object.x as number, object.y as number, object.z as number);
    else if (object.isVector4) {
      out.push(object.x as number, object.y as number, object.z as number, object.w as number);
    } else out.push(NaN); // unknown uniform type: never treat the frame as still
  }
}

function pushMaterial(out: number[], material: Material) {
  const {id} = material as Material & {id: number};
  out.push(id, material.version, material.opacity, material.visible ? 1 : 0);
  const uniforms = (material as ShaderMaterial).uniforms;
  if (uniforms) for (const key in uniforms) pushValue(out, uniforms[key].value);
}

/** Tracks the signature of the last drawn frame. */
export class StillFrameDetector {
  private drawn: number[] = [];
  private next: number[] = [];

  /** Returns true when this frame would draw exactly what the last drawn frame did. */
  isStill(scene: Scene, camera: Camera, width: number, height: number, pixelRatio: number) {
    // World matrices are refreshed by the render this may skip: bring them up to this frame's transforms first,
    // or a turning globe or ring would read as still after the first skipped frame.
    camera.updateMatrixWorld();
    scene.updateMatrixWorld();
    const out = this.next;
    out.length = 0;
    out.push(width, height, pixelRatio);
    out.push(...camera.matrixWorld.elements, ...camera.projectionMatrix.elements);
    const fog = scene.fog as {near?: number; far?: number; color?: unknown} | null;
    if (fog) pushValue(out, [fog.near, fog.far, fog.color]);
    pushValue(out, scene.background);
    scene.traverseVisible((object) => {
      // Everything drawn: meshes, and the lines and points of the globe's rings, trails, lights and stars.
      const mesh = object as Mesh & {isLine?: boolean; isPoints?: boolean};
      if (!(mesh.isMesh || mesh.isLine || mesh.isPoints) || isDissolved(mesh)) return;
      out.push(mesh.id, mesh.renderOrder, ...mesh.matrixWorld.elements);
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) pushMaterial(out, material);
    });

    const still = !changed && out.length === this.drawn.length && out.every((value, i) => value === this.drawn[i]);
    if (!still) {
      this.next = this.drawn;
      this.drawn = out;
      changed = false;
    }
    return still;
  }

  /** Forgets the last frame, so the next one always draws. */
  reset() {
    this.drawn.length = 0;
  }
}
