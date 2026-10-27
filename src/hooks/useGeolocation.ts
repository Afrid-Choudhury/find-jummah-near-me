import { useCallback, useEffect, useState } from "react";
import type { Coordinates, GeolocationStatus } from "@/types";

interface UseGeolocationResult {
  coordinates: Coordinates | null;
  status: GeolocationStatus;
  /** Ask the browser for the user's position. Safe to call repeatedly. */
  requestLocation: () => void;
}

/**
 * Wraps navigator.geolocation with explicit status states so the UI can
 * distinguish "hasn't asked yet" from "denied" from "unsupported browser".
 * A permission dialog only ever follows a user action (button tap) —
 * unprompted dialogs hurt trust and grant rates. The one thing done on mount
 * is locating visitors who *already* granted permission, which shows no
 * dialog and saves them the tap every Friday.
 */
export function useGeolocation(): UseGeolocationResult {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>("idle");

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setStatus("granted");
      },
      (error) => {
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  // Only on "granted". Browsers without the Permissions API, or reporting
  // "prompt" (iOS Safari often does, even for returning visitors), keep the
  // button.
  useEffect(() => {
    let cancelled = false;
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((permission) => {
        if (!cancelled && permission.state === "granted") requestLocation();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [requestLocation]);

  return { coordinates, status, requestLocation };
}
