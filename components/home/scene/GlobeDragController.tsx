import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Mesh } from 'three';

interface GlobeDragControllerProps {
  globeRef: React.RefObject<Mesh | null>;
  rotateSpeed: number;
}

/**
 * Attaching pointer events directly to `gl.domElement` is appropriate here 
 * because we want drag operations originating *anywhere* on the canvas to turn the globe,
 * identical to how standard OrbitControls behaves. 
 *
 * Using `setPointerCapture` is a standard web practice for dragging implementations. 
 * It ensures that if the user drags quickly and the cursor leaves the canvas or 
 * browser window bounds, we don't lose the "pointerup" event or interrupt the drag rotation.
 */
export function GlobeDragController({ globeRef, rotateSpeed }: GlobeDragControllerProps) {
  const { gl } = useThree();
  const isDragging = useRef(false);
  const previousX = useRef(0);

  useEffect(() => {
    const domElement = gl.domElement;
    
    const onPointerDown = (e: PointerEvent) => {
      isDragging.current = true;
      previousX.current = e.clientX;
      domElement.setPointerCapture(e.pointerId);
    };
    
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current || !globeRef.current) return;
      
      const deltaX = e.clientX - previousX.current;
      // Multiply the base rotation increment 0.005 by the configured rotateSpeed.
      globeRef.current.rotation.y += deltaX * 0.005 * rotateSpeed;
      
      previousX.current = e.clientX;
    };
    
    const onPointerUp = (e: PointerEvent) => {
      isDragging.current = false;
      if (domElement.hasPointerCapture(e.pointerId)) {
        domElement.releasePointerCapture(e.pointerId);
      }
    };

    domElement.addEventListener('pointerdown', onPointerDown);
    domElement.addEventListener('pointermove', onPointerMove);
    domElement.addEventListener('pointerup', onPointerUp);
    domElement.addEventListener('pointercancel', onPointerUp);

    return () => {
      domElement.removeEventListener('pointerdown', onPointerDown);
      domElement.removeEventListener('pointermove', onPointerMove);
      domElement.removeEventListener('pointerup', onPointerUp);
      domElement.removeEventListener('pointercancel', onPointerUp);
    };
  }, [gl, globeRef, rotateSpeed]);

  return null;
}