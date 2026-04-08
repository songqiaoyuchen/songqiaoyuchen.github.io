import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Quaternion, Vector3 } from 'three';
import type { HomeLocation } from '../locations/homeLocations';
import { homeLocationToSpherePosition } from '../locations/homeLocationUtils';

interface HomeGlobeOriControllerProps {
  globeRef: React.RefObject<Mesh | null>;
  activeLocation: HomeLocation;
  config: {
    dampingFactor: number;
  };
}

// Target orientation
const FRONT_CENTER = new Vector3(0, 0, 1);

function locationToTargetQuaternion(location: Pick<HomeLocation, 'lat' | 'lon'>): Quaternion {
  const direction = homeLocationToSpherePosition(location, 1).normalize();
  return new Quaternion().setFromUnitVectors(direction, FRONT_CENTER);
}

export function HomeGlobeOriController({
  globeRef,
  activeLocation,
  config,
}: HomeGlobeOriControllerProps) {
  const targetQuaternion = useRef(new Quaternion());

  // Update target orientation on location change
  useEffect(() => {
    targetQuaternion.current.copy(locationToTargetQuaternion(activeLocation));
  }, [activeLocation]);

  // Smoothly slerp globe orientation towards target
  useFrame(() => {
    if (!globeRef.current) {
      return;
    }

    globeRef.current.quaternion.slerp(targetQuaternion.current, config.dampingFactor);
  });

  return null;
}