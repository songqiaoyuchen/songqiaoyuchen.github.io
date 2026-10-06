// Attaches prebuilt contour tube buffers to a Three.js BufferGeometry.
import {BufferAttribute, BufferGeometry} from 'three';
import type {ContourTubeBuffers} from './lineTubeBuffers';

/**
 * The worker builds the pure buffers; this adapter performs only the
 * inexpensive Three.js attachment.
 */
export function createContourTubeGeometry({
  index,
  lineId,
  major,
  normal,
  position,
  shadow,
  t,
  totalLength,
  travelDirection,
}: ContourTubeBuffers): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('normal', new BufferAttribute(normal, 3));
  geometry.setAttribute('t', new BufferAttribute(t, 1));
  geometry.setAttribute('totalLength', new BufferAttribute(totalLength, 1));
  geometry.setAttribute('lineId', new BufferAttribute(lineId, 1));
  geometry.setAttribute('major', new BufferAttribute(major, 1));
  geometry.setAttribute('travelDirection', new BufferAttribute(travelDirection, 1));
  geometry.setAttribute('shadow', new BufferAttribute(shadow, 1));
  geometry.setIndex(new BufferAttribute(index, 1));
  return geometry;
}
