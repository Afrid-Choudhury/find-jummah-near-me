/**
 * Pulling coordinates out of a pasted map link.
 *
 * Pure and dependency-free: no React, no Supabase, no network. Short links
 * are detected rather than followed — resolving one needs a redirect the
 * browser won't let the page make, so the caller asks for the full URL.
 */

/** The bounds `masjids` enforces in SQL (0001_initial_schema.sql). */
export const NYC_BOUNDS = {
  minLatitude: 40.4,
  maxLatitude: 41.0,
  minLongitude: -74.3,
  maxLongitude: -73.6,
} as const;

/**
 * Where a coordinate pair came from, in descending order of trust:
 * - `place`  — the !3d/!4d pair, the place's own coordinates
 * - `center` — the @ pair, the map viewport's center, which need not be the pin
 * - `query`  — a q / query / ll parameter
 * - `pair`   — a bare "lat, lng" typed in directly
 */
export type CoordinateSource = "place" | "center" | "query" | "pair";

export type MapLinkResult =
  | { status: "ok"; latitude: number; longitude: number; source: CoordinateSource }
  | { status: "out-of-bounds"; latitude: number; longitude: number }
  | { status: "short-link" }
  | { status: "not-found" };

const NUMBER = String.raw`-?\d+(?:\.\d+)?`;

/** Google's place coordinates, e.g. …!3d40.7500010!4d-73.9045958 */
const PLACE_PATTERN = new RegExp(String.raw`!3d(${NUMBER})!4d(${NUMBER})`);

/** The map centre, e.g. /@40.7500010,-73.9045958,17z */
const CENTER_PATTERN = new RegExp(String.raw`@(${NUMBER}),(${NUMBER})`);

/** A pair on its own, with or without the space. */
const BARE_PAIR_PATTERN = new RegExp(String.raw`^(${NUMBER})\s*,\s*(${NUMBER})$`);

/** Values of these carry "lat,lng" on Google (q, query) and Apple (ll) links. */
const COORDINATE_PARAMS = ["q", "query", "ll"] as const;

const SHORT_LINK_HOSTS = ["maps.app.goo.gl", "goo.gl/maps", "g.co/kgs"];

function inBounds(latitude: number, longitude: number): boolean {
  return (
    latitude >= NYC_BOUNDS.minLatitude &&
    latitude <= NYC_BOUNDS.maxLatitude &&
    longitude >= NYC_BOUNDS.minLongitude &&
    longitude <= NYC_BOUNDS.maxLongitude
  );
}

function settle(
  latitude: number,
  longitude: number,
  source: CoordinateSource,
): MapLinkResult {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { status: "not-found" };
  }
  if (!inBounds(latitude, longitude)) {
    return { status: "out-of-bounds", latitude, longitude };
  }
  return { status: "ok", latitude, longitude, source };
}

/** Reads a coordinate pair from a q / query / ll parameter, if one is there. */
function fromQueryParams(input: string): { latitude: number; longitude: number } | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  for (const key of COORDINATE_PARAMS) {
    const value = url.searchParams.get(key)?.trim();
    // Only a bare pair counts — `?q=Some+Masjid` is a search term, not a place.
    const match = value ? BARE_PAIR_PATTERN.exec(value) : null;
    if (match?.[1] && match[2]) {
      return { latitude: Number(match[1]), longitude: Number(match[2]) };
    }
  }
  return null;
}

/**
 * Parses a pasted Google/Apple Maps link, or a bare "lat, lng" pair, into
 * coordinates validated against the directory's NYC bounds.
 */
export function parseMapLink(input: string): MapLinkResult {
  const trimmed = input.trim();
  if (!trimmed) return { status: "not-found" };

  if (SHORT_LINK_HOSTS.some((host) => trimmed.includes(host))) {
    return { status: "short-link" };
  }

  const place = PLACE_PATTERN.exec(trimmed);
  if (place?.[1] && place[2]) {
    return settle(Number(place[1]), Number(place[2]), "place");
  }

  const center = CENTER_PATTERN.exec(trimmed);
  if (center?.[1] && center[2]) {
    return settle(Number(center[1]), Number(center[2]), "center");
  }

  const fromQuery = fromQueryParams(trimmed);
  if (fromQuery) {
    return settle(fromQuery.latitude, fromQuery.longitude, "query");
  }

  const pair = BARE_PAIR_PATTERN.exec(trimmed);
  if (pair?.[1] && pair[2]) {
    return settle(Number(pair[1]), Number(pair[2]), "pair");
  }

  return { status: "not-found" };
}
