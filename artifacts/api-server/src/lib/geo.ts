import type { GeoCoordinate } from "@workspace/db";

const EARTH_RADIUS_METERS = 6_371_000;
const METERS_PER_DEGREE = 111_320;

export function distanceMeters(a: GeoCoordinate, b: GeoCoordinate): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = toRadians(b.lat - a.lat);
  const lonDelta = toRadians(b.lon - a.lon);
  const latA = toRadians(a.lat);
  const latB = toRadians(b.lat);
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(lonDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

function toLocalMeters(point: GeoCoordinate, referenceLat: number) {
  return {
    x:
      point.lon *
      METERS_PER_DEGREE *
      Math.cos((referenceLat * Math.PI) / 180),
    y: point.lat * METERS_PER_DEGREE,
  };
}

export function distancePointToSegmentMeters(
  point: GeoCoordinate,
  start: GeoCoordinate,
  end: GeoCoordinate,
): number {
  const referenceLat = point.lat;
  const p = toLocalMeters(point, referenceLat);
  const a = toLocalMeters(start, referenceLat);
  const b = toLocalMeters(end, referenceLat);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const segmentLengthSquared = dx * dx + dy * dy;
  if (segmentLengthSquared === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  const projection = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / segmentLengthSquared),
  );
  return Math.hypot(p.x - (a.x + projection * dx), p.y - (a.y + projection * dy));
}

function pointInPolygon(point: GeoCoordinate, polygon: GeoCoordinate[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const current = polygon[i];
    const previous = polygon[j];
    const crosses =
      current.lat > point.lat !== previous.lat > point.lat &&
      point.lon <
        ((previous.lon - current.lon) * (point.lat - current.lat)) /
          (previous.lat - current.lat || Number.EPSILON) +
          current.lon;
    if (crosses) inside = !inside;
  }
  return inside;
}

function orientation(a: GeoCoordinate, b: GeoCoordinate, c: GeoCoordinate) {
  const value =
    (b.lon - a.lon) * (c.lat - b.lat) -
    (b.lat - a.lat) * (c.lon - b.lon);
  if (Math.abs(value) < 1e-12) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(a: GeoCoordinate, b: GeoCoordinate, c: GeoCoordinate) {
  return (
    b.lon <= Math.max(a.lon, c.lon) + 1e-12 &&
    b.lon + 1e-12 >= Math.min(a.lon, c.lon) &&
    b.lat <= Math.max(a.lat, c.lat) + 1e-12 &&
    b.lat + 1e-12 >= Math.min(a.lat, c.lat)
  );
}

function segmentsIntersect(
  p1: GeoCoordinate,
  q1: GeoCoordinate,
  p2: GeoCoordinate,
  q2: GeoCoordinate,
): boolean {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;
  return false;
}

export function segmentIntersectsPolygon(
  start: GeoCoordinate,
  end: GeoCoordinate,
  polygon: GeoCoordinate[],
): boolean {
  if (pointInPolygon(start, polygon) || pointInPolygon(end, polygon)) return true;
  for (let i = 0; i < polygon.length; i += 1) {
    const next = (i + 1) % polygon.length;
    if (segmentsIntersect(start, end, polygon[i], polygon[next])) return true;
  }
  return false;
}
