import { supabase } from "@/lib/supabase";

/**
 * Community confidence signals. Users never edit official data — they only
 * append anonymous 👍/👎 rows that surface as counters and flag listings
 * for admin review.
 *
 * A localStorage marker prevents casual double-voting from the same browser
 * (best-effort; server-side rate limiting can come later if abused).
 */

export type VoteKind = "confirm" | "report";

/**
 * A vote is either about the listing as a whole or about one schedule, and
 * the two are tracked separately — confirming a masjid's details shouldn't
 * spend your say on whether its 1:15 time is right.
 */
const voteKey = (masjidId: string, jummahTimeId?: string | null) =>
  jummahTimeId ? `fjnm:vote:time:${jummahTimeId}` : `fjnm:vote:${masjidId}`;

export function getExistingVote(
  masjidId: string,
  jummahTimeId?: string | null,
): VoteKind | null {
  try {
    const value = window.localStorage.getItem(voteKey(masjidId, jummahTimeId));
    return value === "confirm" || value === "report" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Records a 👍/👎. Passing `jummahTimeId` scopes it to that schedule, which
 * is what feeds the per-time confidence view and can retract a community
 * time; omitting it keeps the existing masjid-level behaviour.
 */
export async function submitVote(
  masjidId: string,
  kind: VoteKind,
  jummahTimeId?: string | null,
): Promise<void> {
  if (supabase) {
    const table = kind === "confirm" ? "masjid_confirmations" : "masjid_reports";
    const { error } = await supabase
      .from(table)
      .insert({ masjid_id: masjidId, jummah_time_id: jummahTimeId ?? null });
    if (error) {
      throw new Error(`Could not record your feedback: ${error.message}`);
    }
  }
  // Mock mode: succeed silently so the UI flow is testable without a backend.
  try {
    window.localStorage.setItem(voteKey(masjidId, jummahTimeId), kind);
  } catch {
    /* private browsing — vote still counted server-side */
  }
}
