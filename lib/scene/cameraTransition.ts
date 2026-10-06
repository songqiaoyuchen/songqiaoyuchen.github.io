// Camera journey between poses: eased position plus independently slerped orientation.
import {Camera, Matrix4, Quaternion, Vector3} from 'three';

/** Interpolate orientation independently of translation so the focus cannot cross the camera. */
export class CameraTransition {
  private elapsed = 0;
  /** Elapsed share of the journey's duration, 0 to 1 (before easing). */
  progress = 1;
  private readonly startPosition = new Vector3();
  private readonly endPosition = new Vector3();
  private readonly endLookAt = new Vector3();
  private readonly startRotation = new Quaternion();
  private readonly endRotation = new Quaternion();
  private readonly rotationMatrix = new Matrix4();
  private startDistance = 1;
  private endDistance = 1;

  begin(camera: Camera, lookAt: Vector3, position: Vector3, destinationLookAt: Vector3) {
    this.elapsed = 0;
    this.progress = 0;
    this.startPosition.copy(camera.position);
    this.startRotation.copy(camera.quaternion);
    this.startDistance = Math.max(camera.position.distanceTo(lookAt), 0.001);
    this.endPosition.copy(position);
    this.endLookAt.copy(destinationLookAt);
    this.endDistance = Math.max(position.distanceTo(destinationLookAt), 0.001);
    this.rotationMatrix.lookAt(position, destinationLookAt, camera.up);
    this.endRotation.setFromRotationMatrix(this.rotationMatrix);
  }

  advance(camera: Camera, lookAt: Vector3, delta: number, seconds: number, reducedMotion: boolean) {
    // A stalled frame must not skip the visible journey.
    this.elapsed += Math.min(Math.max(delta, 0), 1 / 30);
    const progress = reducedMotion ? 1 : Math.min(this.elapsed / seconds, 1);
    // Zero velocity and acceleration at either end, including the final frame.
    const eased = progress ** 3 * (progress * (progress * 6 - 15) + 10);
    this.progress = progress;
    camera.position.lerpVectors(this.startPosition, this.endPosition, eased);
    camera.quaternion.slerpQuaternions(this.startRotation, this.endRotation, eased);
    const distance = this.startDistance + (this.endDistance - this.startDistance) * eased;
    lookAt.set(0, 0, -1).applyQuaternion(camera.quaternion)
      .multiplyScalar(distance).add(camera.position);
    if (progress === 1) {
      camera.position.copy(this.endPosition);
      lookAt.copy(this.endLookAt);
    }
    // Keep the horizon level and give OrbitControls the same focus on handoff.
    camera.lookAt(lookAt);
    return progress === 1;
  }
}
