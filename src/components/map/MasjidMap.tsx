import { Component, lazy, Suspense, useState, type ReactNode } from "react";
import { cn, formatDistance } from "@/lib/utils";
import type { Coordinates, MasjidWithDistance } from "@/types";
import { PinPlot } from "./PinPlot";
import { PIN_DOT_CLASS } from "./pins";

// MapLibre is several hundred KB — fetched only when a map is actually shown
// (desktop), never with the homepage bundle phones download.
const StreetMap = lazy(() => import("./StreetMap").then((m) => ({ default: m.StreetMap })));

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
 * The desktop map pane: an OpenStreetMap street map (StreetMap), or — if that
 * can't load — a plain plot of the same pins (PinPlot), so the pane never
 * depends on a third party to show something. Both are linked to the list the
 * same way; this component owns what they share: the active masjid's label
 * and the legend.
 */
export function MasjidMap(props: MasjidMapProps) {
  const { masjids, activeId } = props;
  const [streetMapFailed, setStreetMapFailed] = useState(false);
  const active = masjids.find((m) => m.id === activeId) ?? null;
  const fallback = <PinPlot {...props} />;

  return (
    <div
      role="region"
      aria-label={`Map of ${masjids.length} ${masjids.length === 1 ? "masjid" : "masjids"} — the same masjids as the list`}
      className="relative h-full overflow-hidden rounded-card border border-line bg-paper-sunken"
    >
      {streetMapFailed ? (
        fallback
      ) : (
        <LoadFailureBoundary onFail={() => setStreetMapFailed(true)}>
          <Suspense fallback={<div className="h-full" />}>
            <StreetMap {...props} onFail={() => setStreetMapFailed(true)} />
          </Suspense>
        </LoadFailureBoundary>
      )}

      {active && (
        <div className="pointer-events-none absolute left-3 top-3 max-w-[calc(100%-5rem)] truncate rounded-full bg-paper-raised px-3.5 py-1.5 text-sm shadow-raised">
          <span className="font-medium text-night">{active.name}</span>
          {active.distanceMiles !== null && (
            <span className="tabular-nums text-ink-muted"> · {formatDistance(active.distanceMiles)}</span>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-paper-raised/90 px-3 py-2 text-xs text-ink-muted shadow-card">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <LegendItem dot={PIN_DOT_CLASS.verified}>Verified time</LegendItem>
          <LegendItem dot={PIN_DOT_CLASS.community}>Community time</LegendItem>
          <LegendItem dot={PIN_DOT_CLASS.none}>No time yet</LegendItem>
        </ul>
        {streetMapFailed && (
          <p className="mt-1 text-ink-faint">Street map unavailable — showing locations only</p>
        )}
      </div>
    </div>
  );
}

function LegendItem({ dot, children }: { dot: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={cn("block shrink-0 rounded-full", dot)} />
      {children}
    </li>
  );
}

/**
 * Catches the lazy chunk failing to download (or StreetMap throwing) and
 * reports it, so MasjidMap swaps in the fallback instead of the page-level
 * error screen.
 */
class LoadFailureBoundary extends Component<
  { children: ReactNode; onFail: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error("Street map failed to load:", error);
    this.props.onFail();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
