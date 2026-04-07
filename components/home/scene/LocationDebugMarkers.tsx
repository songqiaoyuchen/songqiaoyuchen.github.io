import { useState } from 'react';
import { Html } from '@react-three/drei';
import { HOME_LOCATIONS } from './homeLocations';
import type { HomeLocation } from './homeLocations';
import { GLOBE_CONFIG } from './config';
import { homeLocationToSpherePosition, latLngToSpherePosition } from './homeLocationUtils';

const MARKER_OFFSET = 0.06;
const MARKER_RADIUS = 0.08;

type LocationDebugMarkerProps = {
  location: HomeLocation;
  markerRadius: number;
};

function LocationDebugMarker({ location, markerRadius }: LocationDebugMarkerProps) {
  const position = homeLocationToSpherePosition(location, markerRadius);

  return (
    <mesh
      position={position}
    >
      <sphereGeometry args={[MARKER_RADIUS, 12, 12]} />
      <meshStandardMaterial color="#ff5a36" emissive="#ff5a36" emissiveIntensity={0.9} />
        {/* Location Label */}
        <Html center distanceFactor={12}>
          <div
            style={{
              background: 'rgba(8, 12, 18, 0.9)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              transform: 'translateY(-16px)',
            }}
          >
            {location.label}
          </div>
        </Html>
    </mesh>
  );
}

export function LocationDebugMarkers() {
  // Temporary validation markers for lat/lon mapping and texture orientation checks.
  const markerRadius = GLOBE_CONFIG.radius + MARKER_OFFSET;
  const zeroPosition = latLngToSpherePosition(0, 0, markerRadius);

  return (
    <group>
      {HOME_LOCATIONS.map((location) => (
        <LocationDebugMarker key={location.id} location={location} markerRadius={markerRadius} />
      ))}
      {/* Zero reference marker at lat=0, lon=0 */}
      <mesh position={zeroPosition}>
        <sphereGeometry args={[MARKER_RADIUS * 1.2, 12, 12]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={1} />
      </mesh>
    </group>
  );
}
