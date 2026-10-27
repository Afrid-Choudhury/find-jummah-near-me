import { Link } from "react-router-dom";
import { formatDistance } from "@/lib/utils";
import type { MasjidWithDistance } from "@/types";
import { DirectionsButton } from "./DirectionsButton";

interface MasjidRowProps {
  masjid: MasjidWithDistance;
}

/**
 * The compact listing for a masjid with no Jummah time on record — most of
 * the directory for now. It keeps its place in the distance order (data
 * completeness never outranks distance) but takes a fraction of a full card's
 * height, so the masjids that do have times stand out. Directions stays one
 * tap; the name leads to the page where a time can be suggested.
 */
export function MasjidRow({ masjid }: MasjidRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-paper-raised px-4 py-3">
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-night">
          <Link
            to={`/masjid/${masjid.slug}`}
            className="rounded underline-offset-4 hover:underline"
          >
            {masjid.name}
          </Link>
        </h3>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {masjid.distanceMiles !== null && (
            <span className="font-medium tabular-nums text-night">
              {formatDistance(masjid.distanceMiles)} ·{" "}
            </span>
          )}
          {masjid.neighborhood ?? masjid.borough} · No Jummah time yet
          {/* A listing people say is wrong matters before you travel to it */}
          {masjid.reports > 0 && (
            <span aria-label={`${masjid.reports} users reported this listing as incorrect`}>
              {" "}
              · <span aria-hidden="true">👎</span> {masjid.reports}
            </span>
          )}
        </p>
      </div>
      <DirectionsButton masjid={masjid} variant="outline" className="shrink-0 px-4" />
    </div>
  );
}
