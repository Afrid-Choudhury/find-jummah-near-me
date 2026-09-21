import type { Coordinates } from "@/types";

/** Fallback center when geolocation is denied/unavailable: Midtown Manhattan. */
export const NYC_CENTER: Coordinates = {
  latitude: 40.7549,
  longitude: -73.984,
};

export const BOROUGHS = [
  "Manhattan",
  "Brooklyn",
  "Queens",
  "Bronx",
  "Staten Island",
] as const;

export type Borough = (typeof BOROUGHS)[number];
