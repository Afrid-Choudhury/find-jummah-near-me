import { Link } from "react-router-dom";
import {
  formatArrival,
  formatTime,
  formatTravel,
  type Recommendation,
} from "@/lib/jummah";
import { DirectionsButton } from "./DirectionsButton";

interface RecommendationCardProps {
  recommendation: Recommendation;
}

/**
 * The signature element of the app: on Friday, with location on, this answers
 * "which Jummah can I still make?" in one glance — masjid, time, travel,
 * latest departure, estimated arrival, and one big Directions button.
 */
export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const {
    masjid,
    time,
    travel,
    leaveWithinMinutes,
    arrivalIfLeavingNow,
    summary,
    isUnverified,
  } = recommendation;
  const tel = masjid.phone ? `tel:${masjid.phone.replace(/[^+\d]/g, "")}` : null;

  return (
    <section
      aria-label="Recommended Jummah"
      className="overflow-hidden rounded-card bg-night text-paper shadow-raised"
    >
      <div className="border-b border-paper/10 px-4 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-saffron">
          Recommended for you
        </p>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div>
          <Link
            to={`/masjid/${masjid.slug}`}
            className="font-display text-xl font-semibold underline-offset-4 hover:underline"
          >
            {masjid.name}
          </Link>
          <p className="mt-0.5 text-sm text-paper/70">
            {formatTime(time.khutbahTime)} Jummah · {formatTravel(travel)}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-paper/10 px-3 py-2">
            <dt className="text-xs text-paper/60">Leave within</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-saffron">
              {leaveWithinMinutes <= 0 ? "Now" : `${leaveWithinMinutes} min`}
            </dd>
          </div>
          <div className="rounded-lg bg-paper/10 px-3 py-2">
            <dt className="text-xs text-paper/60">Est. arrival</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">
              {formatArrival(arrivalIfLeavingNow)}
            </dd>
          </div>
        </dl>

        <p className="text-sm text-paper/80">{summary}</p>

        {/* The numbers above read as certainty. When the time underneath them
            is unverified, say so here rather than let that stand. */}
        {isUnverified && (
          <div className="rounded-lg border border-paper/25 bg-paper/10 px-3 py-2">
            <p className="text-sm font-medium text-paper">
              This time came from the community and hasn&apos;t been verified.
            </p>
            <p className="mt-0.5 text-sm text-paper/70">
              Worth calling ahead before you travel.
              {tel ? "" : " No phone number listed for this masjid."}
            </p>
            {tel && (
              <a
                href={tel}
                className="mt-2 inline-flex h-11 items-center rounded-full bg-paper/15 px-4 text-sm font-medium text-paper"
              >
                Call {masjid.phone}
              </a>
            )}
          </div>
        )}

        <DirectionsButton masjid={masjid} className="w-full" />
      </div>
    </section>
  );
}
