import { supabase } from "@/lib/supabase";
import { toTimeSuggestion, type TimeSuggestion } from "@/types";
import type { TimeSuggestionRow } from "@/types/database";

/**
 * User-submitted Jummah times. A suggestion never touches jummah_times on
 * its own — approval (adminService.approveSuggestion) does that, so public
 * data remains admin-verified.
 */

function requireClient() {
  if (!supabase) throw new Error("Suggestions need a connected backend.");
  return supabase;
}

export interface NewSuggestion {
  masjidId: string;
  khutbahNumber: number;
  /** "HH:MM" from <input type="time"> */
  khutbahTime: string;
  iqamahTime: string | null;
  language: string;
  notes: string | null;
}

/**
 * `submitter` is null for a logged-out visitor — the row lands with
 * user_id = null, which the anon RLS policy requires. `contact` is an
 * optional name/email an anonymous submitter can leave for follow-up; it's
 * ignored when signed in, since submitted_by already carries the account
 * email.
 */
export async function submitSuggestion(
  input: NewSuggestion,
  submitter: { id: string; email: string } | null,
  contact?: string | null,
): Promise<void> {
  const { error } = await requireClient().from("time_suggestions").insert({
    masjid_id: input.masjidId,
    user_id: submitter?.id ?? null,
    submitted_by: submitter?.email ?? contact ?? null,
    khutbah_number: input.khutbahNumber,
    khutbah_time: input.khutbahTime,
    iqamah_time: input.iqamahTime,
    language: input.language,
    notes: input.notes,
  });
  if (error) throw new Error(`Could not submit suggestion: ${error.message}`);
}

export async function listMySuggestions(userId: string): Promise<TimeSuggestion[]> {
  const { data, error } = await requireClient()
    .from("time_suggestions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as TimeSuggestionRow[]).map(toTimeSuggestion);
}

/** Admin only (RLS enforced). */
export async function listPendingSuggestions(): Promise<TimeSuggestion[]> {
  const { data, error } = await requireClient()
    .from("time_suggestions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as TimeSuggestionRow[]).map(toTimeSuggestion);
}
