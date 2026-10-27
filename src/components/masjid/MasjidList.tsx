import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { MasjidWithDistance } from "@/types";
import { MasjidCard } from "./MasjidCard";
import { MasjidRow } from "./MasjidRow";

interface MasjidListProps {
  masjids: MasjidWithDistance[];
  now: Date;
  isLoading: boolean;
  error: Error | null;
  searchTerm: string;
  /** Highlighted card — the one whose pin is hovered or was clicked on the map. */
  activeId?: string | null;
  /** Hover or keyboard focus entering/leaving a card, so the map can follow. */
  onActiveChange?: (id: string | null) => void;
}

/** DOM id of a masjid's list item, so the map can scroll a card into view. */
export function masjidCardId(masjidId: string): string {
  return `masjid-card-${masjidId}`;
}

// One column on phones and in the desktop list pane; two on tablets, where the
// list has the whole width to itself. grid-cols-1 rather than the implicit
// column, which would size itself to the rows' unwrapped (truncated) text and
// push past the screen. items-start: a compact row beside a full card keeps
// its own height.
const LIST_GRID = "grid grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-1";

export function MasjidList({
  masjids,
  now,
  isLoading,
  error,
  searchTerm,
  activeId = null,
  onActiveChange,
}: MasjidListProps) {
  if (isLoading) {
    return (
      <div className={LIST_GRID} aria-busy="true" aria-label="Loading masjids">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-card" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-card border border-line bg-paper-raised p-6 text-center">
        <p className="text-sm font-medium text-night">Couldn&apos;t load masjids</p>
        <p className="mt-1 text-sm text-ink-muted">
          Check your connection and refresh the page. ({error.message})
        </p>
      </div>
    );
  }

  if (masjids.length === 0) {
    return (
      <div className="rounded-card border border-line bg-paper-raised p-6 text-center">
        <p className="text-sm font-medium text-night">No masjids match your search</p>
        <p className="mt-1 text-sm text-ink-muted">
          {searchTerm
            ? `Try a different spelling or clear "${searchTerm}".`
            : "New masjids are added regularly."}
        </p>
        <Link
          to="/suggest-masjid"
          className="mt-4 inline-flex h-11 items-center rounded-full bg-night px-4 text-sm font-medium text-paper"
        >
          Suggest a missing masjid
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className={LIST_GRID}>
        {masjids.map((masjid) => (
          <li
            key={masjid.id}
            id={masjidCardId(masjid.id)}
            // Clear of the sticky header + search when scrolled to from the map
            className={cn(
              "scroll-mt-36 rounded-card transition-shadow",
              masjid.id === activeId && "ring-2 ring-night ring-offset-2 ring-offset-paper",
            )}
            onMouseEnter={onActiveChange && (() => onActiveChange(masjid.id))}
            onMouseLeave={onActiveChange && (() => onActiveChange(null))}
            onFocus={onActiveChange && (() => onActiveChange(masjid.id))}
            onBlur={onActiveChange && (() => onActiveChange(null))}
          >
            {masjid.jummahTimes.length > 0 ? (
              <MasjidCard masjid={masjid} now={now} />
            ) : (
              <MasjidRow masjid={masjid} />
            )}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-xs text-ink-muted">
        Masjid not here?{" "}
        <Link to="/suggest-masjid" className="font-medium text-night underline">
          Suggest a missing masjid
        </Link>
      </p>
    </>
  );
}
