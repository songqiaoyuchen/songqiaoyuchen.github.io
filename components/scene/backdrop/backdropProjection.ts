// Maps the live camera onto the fixed plane the backdrop paintings were authored on, keeping them registered.
import {Matrix3, Matrix4, PerspectiveCamera, Vector3, type Camera} from 'three';
import {BACKDROP_CONFIG} from '@/config/art/backdrop';

export type BackdropProjection = {camera: PerspectiveCamera; clip: Matrix4; plane: Matrix4};

/** The authoring camera and the image plane it sees at `projectionDistance`. */
export function createBackdropProjection(): BackdropProjection {
  const config = BACKDROP_CONFIG;
  const camera = new PerspectiveCamera(config.fov, config.aspect, .1, 100);
  camera.position.fromArray(config.position);
  camera.lookAt(new Vector3().fromArray(config.lookAt));
  const halfHeight = config.projectionDistance * Math.tan(config.fov * Math.PI / 360);
  const position = new Vector3(0, 0, -config.projectionDistance)
    .applyQuaternion(camera.quaternion).add(camera.position);
  return {camera, clip: new Matrix4(), plane: new Matrix4().compose(position,
    camera.quaternion, new Vector3(halfHeight * config.aspect, halfHeight, 1))};
}

/**
 * Invert the authoring plane's screen projection to preserve image framing
 * across viewport sizes and the short camera departure from Art.
 */
export function updateScreenToImage(projection: BackdropProjection, camera: Camera, target: Matrix3) {
  projection.clip.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(projection.plane);
  const e = projection.clip.elements;
  target.set(e[0], e[4], e[12], e[1], e[5], e[13], e[3], e[7], e[15]).invert();
}

/** True once the live camera rests on the authoring pose, i.e. the Art journey has arrived. */
export function isRegistered(projection: BackdropProjection, camera: Camera) {
  return camera.position.distanceToSquared(projection.camera.position) < .0004
    && camera.quaternion.angleTo(projection.camera.quaternion) < .002;
}
