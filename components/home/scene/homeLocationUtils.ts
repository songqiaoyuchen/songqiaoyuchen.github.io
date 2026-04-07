import { Vector3 } from 'three';
import type { HomeLocation } from './homeLocations';

const DEG_TO_RAD = Math.PI / 180;

export function latLngToSpherePosition(lat: number, lon: number, radius: number): Vector3 {
  const latRad = lat * DEG_TO_RAD;
  // Offset longitude by +90° so geographic coordinates align with the globe texture mapping.
  const lonRad = (lon + 90) * DEG_TO_RAD; 

  // Uses Y-up coordinates
  const x = radius * Math.cos(latRad) * Math.sin(lonRad);
  const y = radius * Math.sin(latRad);
  const z = radius * Math.cos(latRad) * Math.cos(lonRad);

  return new Vector3(x, y, z);
}

export function homeLocationToSpherePosition(
  location: Pick<HomeLocation, 'lat' | 'lon'>,
  radius: number,
): Vector3 {
  return latLngToSpherePosition(location.lat, location.lon, radius);
}
