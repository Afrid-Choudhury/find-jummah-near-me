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

const voteKey = (masjidId: string) => `fjnm:vote:${masjidId}`;

export function getExistingVote(masjidId: string): VoteKind | null {
  try {
    const value = window.localStorage.getItem(voteKey(masjidId));
    return value === "confirm" || value === "report" ? value : null;
  } catch {
    return null;
  }
}

export async function submitVote(masjidId: string, kind: VoteKind): Promise<void> {
  if (supabase) {
    const table = kind === "confirm" ? "masjid_confirmations" : "masjid_reports";
    const { error } = await supabase.from(table).insert({ masjid_id: masjidId });
    if (error) {
      throw new Error(`Could not record your feedback: ${error.message}`);
    }
  }
  // Mock mode: succeed silently so the UI flow is testable without a backend.
  try {
    window.localStorage.setItem(voteKey(masjidId), kind);
  } catch {
    /* private browsing — vote still counted server-side */
  }
}
