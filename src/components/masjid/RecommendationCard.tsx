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
  const { masjid, time, travel, leaveWithinMinutes, arrivalIfLeavingNow, summary } =
    recommendation;

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

        <DirectionsButton masjid={masjid} className="w-full" />
      </div>
    </section>
  );
}
