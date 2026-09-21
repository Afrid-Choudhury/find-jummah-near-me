import type { Masjid } from "@/types";

/**
 * One-tap directions: Apple Maps on iOS devices (opens the native app),
 * Google Maps everywhere else (native app on Android, web otherwise).
 * Destination is pre-filled with exact coordinates + name so the user
 * never types or pastes an address.
 */
export function directionsUrl(masjid: Pick<Masjid, "coordinates" | "name">): string {
  const { latitude, longitude } = masjid.coordinates;
  const isApple =
    typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isApple) {
    return `https://maps.apple.com/?daddr=${latitude},${longitude}&q=${encodeURIComponent(masjid.name)}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude}%2C${longitude}`;
}
