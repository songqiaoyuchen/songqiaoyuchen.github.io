// The open location's zoom (shaders/terrain/placesLens.glsl has the same maths for the globe, lines, lights and
// trails): a small location magnified on a globe that keeps its size. The surface flows away from the location by a
// conformal zoom of the sphere (stereographic about the location: tan(drawn / 2) = zoom * tan(angle / 2)), so every
// place keeps its bearing and its shape; the scale is the zoom at the location and falls off smoothly across the globe,
// with no edge anywhere. Each location's zoom is sized from the spread of its places; the warp here places its markers.
// lib/scene/placesLensChunk.ts registers the GLSL. Framework-free apart from three's maths, so scripts/test can check
// it.
import {Vector3} from 'three';
import type {LonLat, Location} from '@/data/places';
import {lonLatToUnit} from './places';

const DEG = Math.PI / 180;

/** The zoom as the shaders take it: its centre (unit, globe local), zoom now (1 is none) and relief power. */
export type Lens = {center: Vector3; zoom: number; relief: number};

/** A location's zoom at full; a zoom of 1 is none. */
export type LocationLens = {center: LonLat; zoom: number};

export type LensSettings = {
  /** Degrees the location's farthest place from its centre is drawn at, once zoomed. */
  fill: number;
  maxZoom: number;
  /** Locations that would take less than this are left as they are. */
  minZoom: number;
  /** Share of the farthest place's angle kept as room about the location. */
  margin: number;
};

/** The angle a place `angle` from the centre is drawn at. */
export function lensForward(angle: number, zoom: number) {
  return zoom <= 1.0001 ? angle : 2 * Math.atan(zoom * Math.tan(angle / 2));
}

/** The ground's scale where a place `angle` from the centre is drawn: the zoom there, the same in every direction. */
export function lensScale(angle: number, zoom: number) {
  const half = Math.tan(angle / 2);
  return zoom * (1 + half * half) / (1 + zoom * zoom * half * half);
}

const SIDE = new Vector3();

function angleFrom(center: Vector3, direction: Vector3) {
  return Math.atan2(SIDE.crossVectors(center, direction).length(), direction.dot(center));
}

/** Where a place (unit direction) is drawn, as placesLens.glsl lensWarp; `out` may be `direction`. */
export function lensWarp(direction: Vector3, lens: Lens, out = new Vector3()) {
  if (lens.zoom <= 1.0001) return out.copy(direction);
  const {center} = lens;
  const along = direction.dot(center);
  const drawn = lensForward(angleFrom(center, direction), lens.zoom);
  SIDE.copy(direction).addScaledVector(center, -along);
  const length = SIDE.length();
  if (length < 1e-7) return out.copy(direction);
  return out.copy(center).multiplyScalar(Math.cos(drawn)).addScaledVector(SIDE, Math.sin(drawn) / length);
}

/** Relief gain at a drawn direction: the ground's scale there to the relief power (placesLens.glsl lensRelief). */
export function lensRelief(drawn: Vector3, lens: Lens) {
  if (lens.zoom <= 1.0001) return 1;
  const source = 2 * Math.atan(Math.tan(angleFrom(lens.center, drawn) / 2) / lens.zoom);
  return Math.pow(lensScale(source, lens.zoom), lens.relief);
}

/**
 * A location's zoom: centred on the box about its places (place, stops, tracks; a dense track would pull an average its
 * way), zoomed until the farthest, with its margin, is drawn at `fill`.
 */
export function locationLens(location: Location, settings: LensSettings): LocationLens {
  const places: LonLat[] = [location.place.lonLat, ...(location.stops ?? []).map((stop) => stop.lonLat),
    ...(location.segments ?? []).flat()];
  const units = places.map((place) => lonLatToUnit(place));
  const lons = places.map((place) => place[0]);
  const lats = places.map((place) => place[1]);
  const center = lonLatToUnit([
    (Math.min(...lons) + Math.max(...lons)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2,
  ]);
  const spread = Math.max(...units.map((unit) => unit.angleTo(center)), 0.5 * DEG) * (1 + settings.margin);
  const zoom = Math.min(Math.tan(settings.fill * DEG / 2) / Math.tan(spread / 2), settings.maxZoom);
  return {
    center: [Math.atan2(center.x, center.z) / DEG, Math.asin(center.y) / DEG],
    zoom: zoom < settings.minZoom ? 1 : zoom,
  };
}

/** The zoom's uniforms, one set shared by every material it moves (placesLens.glsl); a zoom of 1 is none. */
export function createLensUniforms() {
  return {
    uLensCenter: {value: new Vector3(0, 0, 1)},
    uLensZoom: {value: 1},
    uLensRelief: {value: 0.5},
  };
}

export type LensUniforms = ReturnType<typeof createLensUniforms>;
