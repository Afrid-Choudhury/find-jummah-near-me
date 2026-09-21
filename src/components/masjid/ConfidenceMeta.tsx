import { formatVerifiedDate } from "@/lib/jummah";
import type { Masjid } from "@/types";

interface ConfidenceMetaProps {
  masjid: Pick<Masjid, "confirmations" | "reports" | "lastVerifiedAt">;
}

/**
 * The trust line shown on every listing: last verified date + community
 * confidence counters. Read-only here; voting lives on the detail page.
 */
export function ConfidenceMeta({ masjid }: ConfidenceMetaProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
      <span>
        {masjid.lastVerifiedAt
          ? `Verified ${formatVerifiedDate(masjid.lastVerifiedAt)}`
          : "Not yet verified"}
      </span>
      <span className="inline-flex items-center gap-1" aria-label={`${masjid.confirmations} users confirmed this listing`}>
        <span aria-hidden="true">👍</span>
        <span className="tabular-nums">{masjid.confirmations}</span>
      </span>
      <span className="inline-flex items-center gap-1" aria-label={`${masjid.reports} users reported this listing as incorrect`}>
        <span aria-hidden="true">👎</span>
        <span className="tabular-nums">{masjid.reports}</span>
      </span>
    </div>
  );
}
