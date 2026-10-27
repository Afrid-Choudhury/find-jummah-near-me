import { useMemo } from "react";
import { cn, formatDistance } from "@/lib/utils";
import { isVerifiedTime, type Coordinates, type Masjid, type MasjidWithDistance } from "@/types";

interface MasjidMapProps {
  masjids: MasjidWithDistance[];
  isLoading: boolean;
  origin: Coordinates | null;
  /** The masjid hovered or selected in the list; its pin is enlarged. */
  activeId: string | null;
  onHoverChange: (id: string | null) => void;
  onSelect: (id: string) => void;
}

/**
 * The desktop map pane. For now a simplified plot — pins positioned by their
 * real coordinates on a plain field, no street tiles — so the list ↔ map
 * linking works end to end. The props are the contract the street map (Leaflet)
 * will keep: swap this component's internals without touching HomePage.
 *
 * Pins are mouse-only and hidden from assistive tech; the list beside the map
 * holds the same masjids and is the accessible way through them.
 */
export function MasjidMap({
  masjids,
  isLoading,
  origin,
  activeId,
  onHoverChange,
  onSelect,
}: MasjidMapProps) {
  const layout = useMemo(() => layoutPins(masjids), [masjids]);
  const active = masjids.find((m) => m.id === activeId) ?? null;

  // Draw order: quieter tiers underneath, the active pin on top of everything.
  const pins = [...layout.pins].sort(
    (a, b) =>
      Number(a.masjid.id === activeId) - Number(b.masjid.id === activeId) ||
      TIER_ORDER[a.tier] - TIER_ORDER[b.tier],
  );
  const originPoint = origin ? layout.project(origin) : null;
  const r = layout.pinRadius;

  return (
    <div
      role="img"
      aria-label={`Map of ${masjids.length} ${masjids.length === 1 ? "masjid" : "masjids"} — the same masjids as the list`}
      className="relative h-full overflow-hidden rounded-card border border-line bg-night"
    >
      {/* Street grid motif, in screen pixels so it doesn't scale with the fit */}
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full opacity-15">
        <defs>
          <pattern id="masjid-map-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" className="stroke-paper" strokeWidth="0.5" />
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
              <circle cx={originPoint.x} cy={originPoint.y} r={r * 2.6} className="fill-paper/15" />
              <circle
                cx={originPoint.x}
                cy={originPoint.y}
                r={r * 0.9}
                className="fill-paper stroke-night"
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
                  className={cn(PIN_CLASS[tier], isActive && "stroke-paper")}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  strokeDasharray={tier === "community" && !isActive ? "2.5 2" : undefined}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
        </svg>
      ) : (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-paper/70">
          {isLoading ? "Loading masjids…" : "No masjids match your search"}
        </p>
      )}

      {active && (
        <div className="pointer-events-none absolute left-3 top-3 max-w-[calc(100%-1.5rem)] rounded-full bg-paper-raised px-3.5 py-1.5 text-sm shadow-raised">
          <span className="font-medium text-night">{active.name}</span>
          {active.distanceMiles !== null && (
            <span className="tabular-nums text-ink-muted"> · {formatDistance(active.distanceMiles)}</span>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2 text-xs text-paper/80">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-saffron-deep bg-saffron" />
            Verified time
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-dashed border-saffron-soft" />
            Community time
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-paper/40" />
            No time yet
          </li>
        </ul>
        <span className="text-paper/50">Simplified map · street map coming soon</span>
      </div>
    </div>
  );
}

type PinTier = "verified" | "community" | "none";

const TIER_ORDER: Record<PinTier, number> = { none: 0, community: 1, verified: 2 };

/** Saffron only for verified times — the same rule as JummahTimeBadge. */
const PIN_CLASS: Record<PinTier, string> = {
  verified: "fill-saffron stroke-saffron-deep",
  community: "fill-night stroke-saffron-soft",
  none: "fill-paper/40 stroke-transparent",
};

/**
 * Same tiers as the list's no-location order (completenessRank in useMasjids).
 * Once seasonal times (0011) land, judge only the rows in effect this Friday,
 * as MasjidCard does — a verified summer row says nothing about winter.
 */
function pinTier(masjid: Masjid): PinTier {
  if (masjid.jummahTimes.length === 0) return "none";
  return masjid.jummahTimes.some(isVerifiedTime) ? "verified" : "community";
}

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
