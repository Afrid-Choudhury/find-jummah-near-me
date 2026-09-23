import { Link } from "react-router-dom";
import { Card } from "@/components/ui";
import { formatTimeUntil, nextJummahForMasjid } from "@/lib/jummah";
import { formatDistance } from "@/lib/utils";
import { isVerifiedTime, type MasjidWithDistance } from "@/types";
import { ConfidenceMeta } from "./ConfidenceMeta";
import { DirectionsButton } from "./DirectionsButton";
import { JummahTimeBadge } from "./JummahTimeBadge";

interface MasjidCardProps {
  masjid: MasjidWithDistance;
  now: Date;
}

/**
 * Everything a person deciding within seconds needs: name, distance, address,
 * today's times, countdown to the next khutbah, trust signals, and a
 * full-size Directions button. The title links to details; the card itself
 * is not a link so Directions stays one tap.
 */
export function MasjidCard({ masjid, now }: MasjidCardProps) {
  const next = nextJummahForMasjid(masjid.jummahTimes, now);
  const unverifiedCount = masjid.jummahTimes.filter((t) => !isVerifiedTime(t)).length;

  return (
    <Card className="p-4 transition-shadow hover:shadow-raised">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold leading-snug text-night">
            <Link
              to={`/masjid/${masjid.slug}`}
              className="rounded underline-offset-4 hover:underline"
            >
              {masjid.name}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm text-ink-muted">{masjid.address}</p>
        </div>
        {masjid.distanceMiles !== null && (
          <span className="shrink-0 rounded-full bg-night/5 px-2.5 py-1 text-sm font-medium tabular-nums text-night">
            {formatDistance(masjid.distanceMiles)}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {masjid.jummahTimes.length > 0 ? (
          masjid.jummahTimes.map((time) => <JummahTimeBadge key={time.id} time={time} />)
        ) : (
          <span className="text-sm text-ink-faint">Jummah time not listed yet</span>
        )}
        {next && (
          <span
            className={`text-sm font-medium ${
              isVerifiedTime(next.time) ? "text-saffron-deep" : "text-ink-muted"
            }`}
          >
            Jummah {formatTimeUntil(next.at, now)}
          </span>
        )}
      </div>
      {unverifiedCount > 0 && (
        <p className="mt-1.5 text-xs text-ink-faint">
          {unverifiedCount === masjid.jummahTimes.length
            ? `Community ${unverifiedCount === 1 ? "time" : "times"} · not checked by us`
            : "Dashed times are community times, not checked by us"}
        </p>
      )}

      <div className="mt-3 flex items-end justify-between gap-3">
        <ConfidenceMeta masjid={masjid} />
        <DirectionsButton masjid={masjid} className="shrink-0" />
      </div>
    </Card>
  );
}
