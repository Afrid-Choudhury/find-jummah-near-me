import { formatTime } from "@/lib/utils";
import type { JummahTime } from "@/types";

interface JummahTimeBadgeProps {
  time: JummahTime;
  showLanguage?: boolean;
}

/** The gilded time chip — the one number people open the app for. */
export function JummahTimeBadge({ time, showLanguage = false }: JummahTimeBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-saffron-soft px-2.5 py-1">
      <span className="text-sm font-semibold tabular-nums text-saffron-deep">
        {formatTime(time.khutbahTime)}
      </span>
      {showLanguage && (
        <span className="text-xs text-saffron-deep/80">{time.language}</span>
      )}
    </span>
  );
}
