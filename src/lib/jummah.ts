import type { JummahTime, MasjidWithDistance } from "@/types";
import { formatTime } from "./utils";

/**
 * All time math for the app lives here as pure functions of (data, now) —
 * no Date.now() calls inside, so everything is unit-testable and countdowns
 * re-render correctly when the caller's clock ticks (see useNow).
 */

const FRIDAY = 5;

/** Average NYC walking pace. */
const WALK_MPH = 3;
/** Beyond this, assume the user will drive / ride. */
const WALK_MAX_MILES = 1.25;
/** Effective city driving speed, lights included. */
const DRIVE_MPH = 12;
/** Parking + walking into the building. */
const DRIVE_OVERHEAD_MIN = 8;

export type TravelMode = "walk" | "drive";

export interface TravelEstimate {
  minutes: number;
  mode: TravelMode;
}

export function estimateTravel(miles: number): TravelEstimate {
  if (miles <= WALK_MAX_MILES) {
    return { minutes: Math.max(1, Math.round((miles / WALK_MPH) * 60)), mode: "walk" };
  }
  return {
    minutes: Math.round((miles / DRIVE_MPH) * 60) + DRIVE_OVERHEAD_MIN,
    mode: "drive",
  };
}

/** Next occurrence of a Friday khutbah time, relative to `now`. */
export function nextJummahOccurrence(khutbahTime: string, now: Date): Date {
  const [hStr = "0", mStr = "0"] = khutbahTime.split(":");
  const occurrence = new Date(now);
  const daysUntilFriday = (FRIDAY - now.getDay() + 7) % 7;
  occurrence.setDate(occurrence.getDate() + daysUntilFriday);
  occurrence.setHours(Number(hStr), Number(mStr), 0, 0);
  if (occurrence <= now) {
    occurrence.setDate(occurrence.getDate() + 7);
  }
  return occurrence;
}

/** Earliest upcoming khutbah across a masjid's schedule, or null if none listed. */
export function nextJummahForMasjid(
  times: JummahTime[],
  now: Date,
): { time: JummahTime; at: Date } | null {
  let best: { time: JummahTime; at: Date } | null = null;
  for (const time of times) {
    const at = nextJummahOccurrence(time.khutbahTime, now);
    if (!best || at < best.at) {
      best = { time, at };
    }
  }
  return best;
}

/** "in 4 min" / "in 1 hr 20 min" / "Friday 1:15 PM" */
export function formatTimeUntil(target: Date, now: Date): string {
  const diffMin = Math.round((target.getTime() - now.getTime()) / 60_000);
  if (diffMin <= 0) return "now";
  if (diffMin < 60) return `in ${diffMin} min`;
  if (diffMin < 6 * 60) {
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return m === 0 ? `in ${h} hr` : `in ${h} hr ${m} min`;
  }
  const sameDay = target.toDateString() === now.toDateString();
  const timeLabel = target.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return sameDay ? `today ${timeLabel}` : `Friday ${timeLabel}`;
}

/**
 * Pinned to New York rather than the machine's zone: pre-rendered pages are
 * built on a UTC server, and an evening verification would otherwise show a
 * different date there than in the visitor's browser.
 */
export function formatVerifiedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });
}

export type ProvenanceKind =
  | "verified"
  | "admin-unverified"
  | "community-confirmed"
  | "community-unconfirmed";

/**
 * The one wording of "how much should you trust this time". KhutbahTiming
 * renders it and the pre-rendered masjid pages print it, so the two can't
 * describe the same row differently (architecture rule 4).
 */
export function describeProvenance(
  time: Pick<JummahTime, "source" | "lastVerifiedAt" | "confirmations" | "reports">,
): { kind: ProvenanceKind; label: string } {
  if (time.source === "admin" && time.lastVerifiedAt) {
    return { kind: "verified", label: `Verified ${formatVerifiedDate(time.lastVerifiedAt)}` };
  }
  if (time.source === "admin") {
    return { kind: "admin-unverified", label: "Not yet verified" };
  }
  if (time.confirmations > 0 && time.confirmations >= time.reports) {
    const people = time.confirmations === 1 ? "person" : "people";
    return {
      kind: "community-confirmed",
      label: `Community time · confirmed by ${time.confirmations} ${people}`,
    };
  }
  return { kind: "community-unconfirmed", label: "Community time · not yet confirmed" };
}

/** Shown under an unconfirmed community time, on the page and in pre-rendered HTML. */
export const COMMUNITY_UNCONFIRMED_NOTE =
  "Not checked by us — from the masjid's website or someone who prays here. If you've prayed here, confirming it helps everyone else.";

/* ---------------------------------------------------------------------------
 * Khutbah timing — what happens, and when, once you are inside the masjid.
 *
 * The schema stores only khutbah_time and iqamah_time, so every other moment
 * below is derived from those two. Anything a masjid did not actually state is
 * flagged as an estimate for the UI; a guess is never dressed up as a listed
 * time — accuracy is the product.
 * ------------------------------------------------------------------------- */

/** Jummah salah itself: two rakah, plus settling in and the salaams. */
const PRAYER_MINUTES = 15;
/** Fallback khutbah length, used only when a masjid has not listed iqamah. */
const TYPICAL_KHUTBAH_MINUTES = 20;

export type KhutbahPhase = "not-today" | "before" | "khutbah" | "prayer" | "ended";

export interface KhutbahTimeline {
  /** When this khutbah starts — today when it is Friday, else the coming one. */
  startsAt: Date;
  /** Listed iqamah. Null when unlisted, or when it is not after the khutbah. */
  iqamahAt: Date | null;
  /** Roughly when the congregation finishes. Always an estimate. */
  endsAboutAt: Date;
  /** Minutes of khutbah before iqamah; null when iqamah is not listed. */
  khutbahMinutes: number | null;
  /** True when `endsAboutAt` rests on the fallback rather than a listed iqamah. */
  isRoughEstimate: boolean;
  phase: KhutbahPhase;
  /** Short status for a badge, e.g. "Khutbah in progress". */
  statusLabel: string;
}

/** That clock time, on that calendar day. */
function atTimeOn(time: string, day: Date): Date {
  const [hStr = "0", mStr = "0"] = time.split(":");
  const at = new Date(day);
  at.setHours(Number(hStr), Number(mStr), 0, 0);
  return at;
}

/** A Date as a wall-clock time, e.g. "1:15 PM". */
export function formatClock(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/**
 * Expand one stored schedule into the sequence a person actually experiences:
 * khutbah begins → iqamah → prayer ends. Pure in (time, now), so the detail
 * page re-renders honestly as `useNow` ticks.
 */
export function buildKhutbahTimeline(time: JummahTime, now: Date): KhutbahTimeline {
  const isFriday = now.getDay() === FRIDAY;
  const startsAt = isFriday
    ? atTimeOn(time.khutbahTime, now)
    : nextJummahOccurrence(time.khutbahTime, now);

  const listed = time.iqamahTime ? atTimeOn(time.iqamahTime, startsAt) : null;
  // Bad data guard: an iqamah at or before the khutbah tells us nothing.
  const iqamahAt = listed && listed > startsAt ? listed : null;

  const khutbahMinutes = iqamahAt
    ? Math.round((iqamahAt.getTime() - startsAt.getTime()) / 60_000)
    : null;

  const endsAboutAt = new Date(
    (iqamahAt ?? startsAt).getTime() +
      (iqamahAt ? PRAYER_MINUTES : TYPICAL_KHUTBAH_MINUTES + PRAYER_MINUTES) * 60_000,
  );

  let phase: KhutbahPhase = "not-today";
  if (isFriday) {
    if (now < startsAt) phase = "before";
    else if (iqamahAt && now < iqamahAt) phase = "khutbah";
    else if (now < endsAboutAt) phase = "prayer";
    else phase = "ended";
  }

  const statusLabel =
    phase === "before"
      ? `Starts ${formatTimeUntil(startsAt, now)}`
      : phase === "khutbah"
        ? "Khutbah in progress"
        : phase === "prayer"
          ? iqamahAt
            ? "Prayer underway"
            : "In progress"
          : phase === "ended"
            ? "Finished for today"
            : "This Friday";

  return {
    startsAt,
    iqamahAt,
    endsAboutAt,
    khutbahMinutes,
    isRoughEstimate: iqamahAt === null,
    phase,
    statusLabel,
  };
}

/* ---------------------------------------------------------------------------
 * Recommendation engine — answers "which Jummah can I still make?"
 * ------------------------------------------------------------------------- */

export interface Recommendation {
  masjid: MasjidWithDistance;
  time: JummahTime;
  /** When this khutbah starts. */
  startsAt: Date;
  travel: TravelEstimate;
  /** Latest departure that still arrives before the khutbah. */
  leaveWithinMinutes: number;
  /** Arrival if the user leaves now. */
  arrivalIfLeavingNow: Date;
  /** Human summary, e.g. "You should arrive before the khutbah." */
  summary: string;
  /**
   * True when this pick rests on a community time nobody has verified. The
   * card must say so — "leave within 4 minutes" reads as certainty, and it
   * shouldn't when the underlying time is someone's word.
   */
  isUnverified: boolean;
}

/**
 * Pick the best khutbah the user can realistically still reach **today**.
 *
 * Strategy: consider every khutbah still ahead of `now` on this Friday,
 * keep those where (now + travel) <= start, then prefer the earliest start
 * (catch Jummah as soon as possible) and break ties by shortest travel.
 * If a nearby khutbah has already started, later khutbahs — including a
 * masjid's second khutbah — naturally become the recommendation.
 *
 * Community times are eligible: excluding them would leave the engine with
 * almost nothing to work with. The resulting `isUnverified` flag is how the
 * card qualifies its confidence. Times the crowd retracted never arrive here
 * at all — the mapper keeps them out of `masjid.jummahTimes`.
 *
 * Returns null when it isn't Friday, location is unknown, or nothing is
 * reachable anymore.
 */
export function recommendBestJummah(
  masjids: MasjidWithDistance[],
  now: Date,
): Recommendation | null {
  if (now.getDay() !== FRIDAY) return null;

  let best: Recommendation | null = null;

  for (const masjid of masjids) {
    if (masjid.distanceMiles === null) continue;
    const travel = estimateTravel(masjid.distanceMiles);

    for (const time of masjid.jummahTimes) {
      const startsAt = nextJummahOccurrence(time.khutbahTime, now);
      // Only today's remaining khutbahs count as "still makeable".
      if (startsAt.toDateString() !== now.toDateString()) continue;

      const arrivalIfLeavingNow = new Date(now.getTime() + travel.minutes * 60_000);
      if (arrivalIfLeavingNow > startsAt) continue; // can't make it

      const leaveWithinMinutes = Math.floor(
        (startsAt.getTime() - now.getTime()) / 60_000 - travel.minutes,
      );

      const candidate: Recommendation = {
        masjid,
        time,
        startsAt,
        travel,
        leaveWithinMinutes,
        arrivalIfLeavingNow,
        summary:
          leaveWithinMinutes >= 5
            ? "You should arrive before the khutbah."
            : "Leave now to arrive before the khutbah.",
        isUnverified: time.source === "community" && time.lastVerifiedAt === null,
      };

      const better =
        !best ||
        candidate.startsAt < best.startsAt ||
        (candidate.startsAt.getTime() === best.startsAt.getTime() &&
          candidate.travel.minutes < best.travel.minutes);

      if (better) best = candidate;
    }
  }

  return best;
}

export function formatTravel(travel: TravelEstimate): string {
  return `${travel.minutes} minute ${travel.mode === "walk" ? "walk" : "drive"}`;
}

export function formatArrival(date: Date): string {
  return formatClock(date);
}

export { formatTime };
