import { useEffect, useRef } from "react";
import {
  LngLatBounds,
  MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type LngLatLike,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre finds its worker relative to its own file, which stops being true
// once Vite bundles it into a chunk — so Vite builds the worker as its own
// asset and we hand MapLibre the URL.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import type { Coordinates, MasjidWithDistance } from "@/types";
import { PIN_DOT_CLASS, pinTier, TIER_ORDER, type PinTier } from "./pins";

setWorkerUrl(workerUrl);

/**
 * OpenFreeMap's public instance: OpenStreetMap data, no key, no account, no
 * view limits (openfreemap.org). Attribution is required and MapLibre adds
 * it from the style. No SLA — if it's unreachable, onFail swaps in PinPlot.
 */
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const NYC_CENTER: LngLatLike = [-73.94, 40.72];
const LOAD_TIMEOUT_MS = 10_000;
/** With a location, frame it with this many of the nearest masjids. */
const NEAREST_TO_FRAME = 10;
/** Farther than this and the visitor isn't in NYC — frame the masjids alone. */
const MAX_FRAMING_MILES = 25;

interface StreetMapProps {
  masjids: MasjidWithDistance[];
  origin: Coordinates | null;
  activeId: string | null;
  onHoverChange: (id: string | null) => void;
  onSelect: (id: string) => void;
  /** The map can't be shown (style unreachable, no WebGL) — use the fallback. */
  onFail: () => void;
}

interface PinMarker {
  marker: Marker;
  dot: HTMLElement;
  tier: PinTier;
}

/**
 * MapLibre map with one HTML marker per masjid, styled from design tokens.
 * Loaded on demand by MasjidMap, which only mounts on desktop, so the library
 * never reaches phones.
 */
export function StreetMap({
  masjids,
  origin,
  activeId,
  onHoverChange,
  onSelect,
  onFail,
}: StreetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pinsRef = useRef(new Map<string, PinMarker>());
  const hasFittedRef = useRef(false);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  // Markers are created once per result set; read the latest handlers.
  const handlers = useRef({ onHoverChange, onSelect, onFail });
  handlers.current = { onHoverChange, onSelect, onFail };

  useEffect(() => {
    if (!containerRef.current) return;
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: STYLE_URL,
        center: NYC_CENTER,
        zoom: 10,
        dragRotate: false,
        attributionControl: { compact: true },
      });
    } catch {
      handlers.current.onFail(); // typically no WebGL
      return;
    }
    map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    // Before the style loads, any error means no map; afterwards a missing
    // tile is only a gap, not a reason to throw the map away.
    let loaded = false;
    const timeout = window.setTimeout(() => {
      if (!loaded) handlers.current.onFail();
    }, LOAD_TIMEOUT_MS);
    map.once("load", () => {
      loaded = true;
      window.clearTimeout(timeout);
    });
    map.on("error", () => {
      if (!loaded) handlers.current.onFail();
    });

    mapRef.current = map;
    return () => {
      window.clearTimeout(timeout);
      map.remove();
      mapRef.current = null;
      hasFittedRef.current = false;
    };
  }, []);

  // One marker per masjid, rebuilt when the results change, then refit.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const pins = new Map<string, PinMarker>();
    for (const masjid of masjids) {
      const tier = pinTier(masjid);
      // MapLibre positions the outer element with an inline transform, so
      // the visible dot (which scales when active) is a child of it.
      const element = document.createElement("div");
      element.className = "flex h-6 w-6 cursor-pointer items-center justify-center";
      element.setAttribute("aria-hidden", "true"); // the list is the accessible way in
      element.title = masjid.name;
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        handlers.current.onSelect(masjid.id);
      });
      element.addEventListener("mouseenter", () => handlers.current.onHoverChange(masjid.id));
      element.addEventListener("mouseleave", () => handlers.current.onHoverChange(null));
      const dot = document.createElement("span");
      element.append(dot);

      const marker = new Marker({ element })
        .setLngLat([masjid.coordinates.longitude, masjid.coordinates.latitude])
        .addTo(map);
      pins.set(masjid.id, { marker, dot, tier });
    }
    pinsRef.current = pins;

    const frame = framingPoints(masjids, origin);
    if (frame.length > 0) {
      const bounds = frame.reduce(
        (b, c) => b.extend([c.longitude, c.latitude]),
        new LngLatBounds(),
      );
      map.fitBounds(bounds, {
        padding: 64,
        maxZoom: 15,
        duration: hasFittedRef.current && !reduceMotion ? 600 : 0,
      });
      hasFittedRef.current = true;
    }

    return () => {
      pins.forEach(({ marker }) => marker.remove());
    };
    // origin is deliberately not a dependency: useMasjids re-sorts by distance
    // whenever it changes, so new results are the one trigger to refit on.
  }, [masjids]);

  // Pin styling: tier, plus enlarged and on top when active.
  useEffect(() => {
    pinsRef.current.forEach(({ marker, dot, tier }, id) => {
      const isActive = id === activeId;
      dot.className = cn(
        "block rounded-full shadow-card transition-transform",
        PIN_DOT_CLASS[tier],
        isActive && "scale-150 ring-4 ring-night/20",
      );
      marker.getElement().style.zIndex = String(isActive ? 10 : TIER_ORDER[tier]);
    });
  }, [activeId, masjids]);

  // Where the visitor is: night-green dot with a halo, unlike any pin.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !origin) return;
    const element = document.createElement("div");
    element.setAttribute("aria-hidden", "true");
    element.title = "You are here";
    element.className =
      "h-4 w-4 rounded-full border-2 border-paper-raised bg-night ring-8 ring-night/15 shadow-raised";
    const marker = new Marker({ element })
      .setLngLat([origin.longitude, origin.latitude])
      .addTo(map);
    marker.getElement().style.zIndex = "20";
    return () => {
      marker.remove();
    };
  }, [origin]);

  // The sepia nudges Positron's cool grey toward the paper palette; it touches
  // only the canvas, so the pins keep their exact token colours.
  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-paper-sunken [&_.maplibregl-canvas]:sepia-[.2]"
    />
  );
}

/**
 * What to fit the view to. With a location in NYC: the visitor plus the
 * nearest few masjids — "near me", not the whole city. Otherwise every result.
 */
function framingPoints(masjids: MasjidWithDistance[], origin: Coordinates | null): Coordinates[] {
  const nearest = masjids[0]?.distanceMiles;
  if (origin && nearest != null && nearest <= MAX_FRAMING_MILES) {
    return [origin, ...masjids.slice(0, NEAREST_TO_FRAME).map((m) => m.coordinates)];
  }
  return masjids.map((m) => m.coordinates);
}
