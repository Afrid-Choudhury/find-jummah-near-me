import { useCallback, useState } from "react";
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
 * Location is requested on user action (button tap), never on mount —
 * unprompted permission dialogs hurt trust and grant rates.
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

  return { coordinates, status, requestLocation };
}
