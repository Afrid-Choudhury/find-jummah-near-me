import { formatTime } from "./utils";

/**
 * The window a typed Jummah time should fall in. Jummah can't start before
 * Dhuhr — about 11:50 AM at its earliest in NYC (November) — and even a third
 * Jummah rarely runs past 3:30 PM. Outside 11 AM–4 PM a time is almost
 * certainly a slip, most often AM for PM: a time input in a 12-hour locale
 * reads "1:15" as 1:15 AM, which is how a verified "1:15 AM" khutbah reached
 * production.
 */
export const EARLIEST_JUMMAH_MINUTES = 11 * 60;
export const LATEST_JUMMAH_MINUTES = 16 * 60;

export interface TimeEntryWarning {
  message: string;
  /** "HH:MM" to offer as a one-tap fix — the PM reading of an AM slip. */
  suggestion: string | null;
}

/**
 * Checks a time-input value ("HH:MM", or Postgres "HH:MM:SS") against the
 * Jummah window. Pure: null when the time is plausible or not a time at all.
 */
export function jummahTimeWarning(value: string): TimeEntryWarning | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  if (minutes >= EARLIEST_JUMMAH_MINUTES && minutes <= LATEST_JUMMAH_MINUTES) return null;

  if (minutes < EARLIEST_JUMMAH_MINUTES) {
    const pm = minutes + 12 * 60;
    const pmIsPlausible = pm >= EARLIEST_JUMMAH_MINUTES && pm <= LATEST_JUMMAH_MINUTES;
    return {
      message: `${formatTime(value)} is too early — Jummah starts after Dhuhr, around midday.`,
      suggestion: pmIsPlausible ? toInputValue(pm) : null,
    };
  }
  return {
    message: `${formatTime(value)} is later than any Jummah we'd expect — double-check it.`,
    suggestion: null,
  };
}

function toInputValue(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
