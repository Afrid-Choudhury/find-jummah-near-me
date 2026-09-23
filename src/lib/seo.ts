import { isVerifiedTime, type Masjid } from "@/types";
import { formatVerifiedDate } from "./jummah";
import { formatTime } from "./utils";

/**
 * Titles and descriptions for masjid pages — what a searcher reads in the
 * Google result before deciding to click. Pure, so the live page
 * (useDocumentMeta) and the build-time pre-render produce identical text.
 *
 * The times go in the title because they're the answer people are searching
 * for. The description then says how far to trust them: a result reading
 * "1:30 PM" for an unconfirmed community time must not pass as checked
 * (architecture rule 4), so it says so in plain words.
 */

export const SITE_NAME = "Find Jummah Near Me";

/** "12:35, 1:20 & 2:05 PM" — shared AM/PM collapsed; mixed kept in full. */
export function formatTimeList(times: string[]): string {
  const formatted = times.map(formatTime);
  if (formatted.length === 0) return "";
  const periods = new Set(formatted.map((t) => t.slice(-2)));
  const parts =
    periods.size === 1
      ? formatted.map((t, i) => (i === formatted.length - 1 ? t : t.slice(0, -3)))
      : formatted;
  if (parts.length === 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} & ${parts[parts.length - 1]}`;
}

function khutbahTimes(masjid: Masjid): string[] {
  return [...masjid.jummahTimes]
    .sort((a, b) => a.khutbahNumber - b.khutbahNumber)
    .map((t) => t.khutbahTime);
}

function place(masjid: Masjid): string {
  return masjid.neighborhood ? `${masjid.neighborhood}, ${masjid.borough}` : masjid.borough;
}

export function masjidPageTitle(masjid: Masjid): string {
  const times = khutbahTimes(masjid);
  if (times.length === 0) return `${masjid.name} — Jummah Times | ${SITE_NAME}`;
  return `${masjid.name} — Jummah ${formatTimeList(times)} | ${SITE_NAME}`;
}

export function masjidPageDescription(masjid: Masjid): string {
  const times = khutbahTimes(masjid);
  if (times.length === 0) {
    return `${masjid.name} in ${place(masjid)}: address and directions. No Jummah time listed yet — if you know it, you can add it.`;
  }

  const list = formatTimeList(times);
  const khutbah = times.length === 1 ? "khutbah" : "khutbahs";
  const verified = masjid.jummahTimes.filter(isVerifiedTime);

  let trust: string;
  if (verified.length === masjid.jummahTimes.length && masjid.lastVerifiedAt) {
    trust = `Verified ${formatVerifiedDate(masjid.lastVerifiedAt)}.`;
  } else if (verified.length === 0) {
    trust =
      times.length === 1
        ? "A community time, not yet confirmed — call ahead to check."
        : "Community times, not yet confirmed — call ahead to check.";
  } else {
    trust = "Some times are from the community and not yet confirmed.";
  }

  return `Jummah at ${masjid.name}, ${place(masjid)}: ${khutbah} at ${list}. ${trust} Address and directions.`;
}
