import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

interface HomeGlobeNavControllerProps {
  globeRef: React.RefObject<Mesh | null>;
  config: {
    rotateSpeed: number;
    dampingFactor: number;
  };
}

/**
 * A custom controller that allows users to click and drag the globe to rotate it horizontally.
 */
export function HomeGlobeNavController({ globeRef, config }: HomeGlobeNavControllerProps) {
  const { gl } = useThree();
  const isDragging = useRef(false);
  const previousX = useRef(0);
  const targetRotationY = useRef(0);

  // Initialize target rotation to current globe rotation on mount
  // This sync is needed in case the globe starts with a non-zero rotation in the future
  useEffect(() => {
    if (globeRef.current) {
      targetRotationY.current = globeRef.current.rotation.y;
    }
  }, [globeRef]);

  useEffect(() => {
    const domElement = gl.domElement;

    const stopDragging = (pointerId?: number) => {
      isDragging.current = false;
      if (pointerId != null && domElement.hasPointerCapture(pointerId)) {
        domElement.releasePointerCapture(pointerId);
      }
    };
    
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
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
    
    const onPointerUp = (e: PointerEvent) => stopDragging(e.pointerId);
    const onPointerCancel = (e: PointerEvent) => stopDragging(e.pointerId);
    const onLostPointerCapture = () => stopDragging();

    domElement.addEventListener('pointerdown', onPointerDown);
    domElement.addEventListener('lostpointercapture', onLostPointerCapture);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);

    return () => {
      domElement.removeEventListener('pointerdown', onPointerDown);
      domElement.removeEventListener('lostpointercapture', onLostPointerCapture);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      stopDragging();
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