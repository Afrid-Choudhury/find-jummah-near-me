import { formatTime } from "@/lib/utils";
import { isVerifiedTime, type JummahTime } from "@/types";

interface JummahTimeBadgeProps {
  time: JummahTime;
  showLanguage?: boolean;
}

/**
 * The time chip — the one number people open the app for. Verified times are
 * gilded; anything else gets the same dashed, neutral treatment as its card on
 * the masjid page, so the list never looks more certain than the detail.
 */
export function JummahTimeBadge({ time, showLanguage = false }: JummahTimeBadgeProps) {
  const verified = isVerifiedTime(time);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 ${
        verified ? "bg-saffron-soft" : "border border-dashed border-line bg-paper-sunken/40"
      }`}
    >
      <span
        className={`text-sm font-semibold tabular-nums ${
          verified ? "text-saffron-deep" : "text-night"
        }`}
      >
        {formatTime(time.khutbahTime)}
      </span>
      {!verified && <span className="sr-only">(not verified)</span>}
      {showLanguage && (
        <span className={`text-xs ${verified ? "text-saffron-deep/80" : "text-ink-muted"}`}>
          {time.language}
        </span>
      )}
    </span>
  );
}
