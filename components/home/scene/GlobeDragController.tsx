import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

interface GlobeDragControllerProps {
  globeRef: React.RefObject<Mesh | null>;
  config: {
    rotateSpeed: number;
    dampingFactor: number;
  };
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
export function GlobeDragController({ globeRef, config }: GlobeDragControllerProps) {
  const { gl } = useThree();
  const isDragging = useRef(false);
  const previousX = useRef(0);
  const targetRotationY = useRef(0);

  // Initialize target rotation to current globe rotation on mount
  useEffect(() => {
    if (globeRef.current) {
      targetRotationY.current = globeRef.current.rotation.y;
    }
  }, [globeRef]);

  useEffect(() => {
    const domElement = gl.domElement;
    
    const onPointerDown = (e: PointerEvent) => {
      isDragging.current = true;
      previousX.current = e.clientX;
      domElement.setPointerCapture(e.pointerId);
    };
    
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      
      const deltaX = e.clientX - previousX.current;
      // Update the target rotation instead of directly mutating the mesh
      targetRotationY.current += deltaX * 0.005 * config.rotateSpeed;
      
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
  }, [gl, config.rotateSpeed]);

  useFrame(() => {
    if (globeRef.current) {
      const damping = config.dampingFactor;
      // Smoothly interpolate the globe's actual rotation toward the target
      const diff = targetRotationY.current - globeRef.current.rotation.y;
      globeRef.current.rotation.y += diff * damping;
    }
  });

  return null;
}