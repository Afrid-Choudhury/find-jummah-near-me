import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Coordinates, MasjidWithDistance } from "@/types";
import { pinTier, TIER_ORDER, type PinTier } from "./pins";

interface PinPlotProps {
  masjids: MasjidWithDistance[];
  isLoading: boolean;
  origin: Coordinates | null;
  activeId: string | null;
  onHoverChange: (id: string | null) => void;
  onSelect: (id: string) => void;
}

/**
 * The fallback when the street map can't load (tiles unreachable, no WebGL):
 * pins at their real coordinates on a plain field. Depends on nothing outside
 * this app, so the map pane always shows something.
 */
export function PinPlot({
  masjids,
  isLoading,
  origin,
  activeId,
  onHoverChange,
  onSelect,
}: PinPlotProps) {
  const layout = useMemo(() => layoutPins(masjids), [masjids]);

  // Draw order: quieter tiers underneath, the active pin on top of everything.
  const pins = [...layout.pins].sort(
    (a, b) =>
      Number(a.masjid.id === activeId) - Number(b.masjid.id === activeId) ||
      TIER_ORDER[a.tier] - TIER_ORDER[b.tier],
  );
  const originPoint = origin ? layout.project(origin) : null;
  const r = layout.pinRadius;

  return (
    <div className="relative h-full bg-paper-sunken">
      {/* Street grid motif, in screen pixels so it doesn't scale with the fit */}
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full">
        <defs>
          <pattern id="masjid-map-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" className="stroke-line" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#masjid-map-grid)" />
      </svg>

      {masjids.length > 0 ? (
        <svg
          aria-hidden="true"
          viewBox={layout.viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
        >
          {originPoint && (
            <g>
              <circle cx={originPoint.x} cy={originPoint.y} r={r * 2.6} className="fill-night/15" />
              <circle
                cx={originPoint.x}
                cy={originPoint.y}
                r={r * 0.9}
                className="fill-night stroke-paper-raised"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}
          {pins.map(({ masjid, tier, x, y }) => {
            const isActive = masjid.id === activeId;
            return (
              <g
                key={masjid.id}
                className="cursor-pointer"
                onClick={() => onSelect(masjid.id)}
                onMouseEnter={() => onHoverChange(masjid.id)}
                onMouseLeave={() => onHoverChange(null)}
              >
                <title>{masjid.name}</title>
                {/* Generous invisible hit area — the drawn pins are small */}
                <circle cx={x} cy={y} r={r * 2.2} className="fill-transparent" />
                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? r * 1.7 : tier === "none" ? r * 0.7 : r}
                  className={cn(PLOT_PIN_CLASS[tier], isActive && "stroke-night")}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  strokeDasharray={tier === "community" ? "2.5 2" : undefined}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
        </svg>
      ) : (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-ink-muted">
          {isLoading ? "Loading masjids…" : "No masjids match your search"}
        </p>
      )}
    </div>
  );
}

/** SVG twins of PIN_DOT_CLASS in ./pins. */
const PLOT_PIN_CLASS: Record<PinTier, string> = {
  verified: "fill-saffron stroke-saffron-deep",
  community: "fill-paper-raised stroke-night",
  none: "fill-ink-faint stroke-paper-raised",
};

/** About a kilometre — so a single result isn't fitted to a point. */
const MIN_SPAN_DEGREES = 0.01;

/**
 * Equirectangular projection fitted to the masjids shown. At NYC's latitude a
 * degree of longitude is ~0.76 of a degree of latitude; scaling x by cos(lat)
 * keeps the boroughs their real shape. y is negated so north is up.
 */
function layoutPins(masjids: MasjidWithDistance[]) {
  const lats = masjids.map((m) => m.coordinates.latitude);
  const midLat = lats.length > 0 ? (Math.min(...lats) + Math.max(...lats)) / 2 : 40.7;
  const cosLat = Math.cos((midLat * Math.PI) / 180);
  const project = (c: Coordinates) => ({ x: c.longitude * cosLat, y: -c.latitude });

  const pins = masjids.map((masjid) => ({
    masjid,
    tier: pinTier(masjid),
    ...project(masjid.coordinates),
  }));

  const xs = pins.map((p) => p.x);
  const ys = pins.map((p) => p.y);
  // 1.15: breathing room around the outermost pins
  const width = Math.max(MIN_SPAN_DEGREES, Math.max(...xs) - Math.min(...xs)) * 1.15;
  const height = Math.max(MIN_SPAN_DEGREES, Math.max(...ys) - Math.min(...ys)) * 1.15;
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;

  return {
    pins,
    project,
    viewBox: `${cx - width / 2} ${cy - height / 2} ${width} ${height}`,
    // Relative to the larger span, so pins render ~6px whatever the fit
    pinRadius: Math.max(width, height) * 0.0075,
  };
}
