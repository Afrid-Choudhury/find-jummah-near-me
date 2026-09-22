import { supabase } from "@/lib/supabase";
import { toMasjidSuggestion, type MasjidSuggestion } from "@/types";
import type { MasjidSuggestionRow } from "@/types/database";

/**
 * Proposals for masjids that aren't in the directory yet. Like time
 * suggestions, these are append-only from the client: anyone may submit,
 * only an admin can read or act on them, and nothing appears publicly until
 * an admin creates the real masjid from it (migration 0008).
 */

function requireClient() {
  if (!supabase) throw new Error("Suggestions need a connected backend.");
  return supabase;
}

export interface NewMasjidSuggestion {
  name: string;
  address: string;
  borough: string | null;
  neighborhood: string | null;
  phone: string | null;
  website: string | null;
  /** "HH:MM" from <input type="time">, or null if they don't know it. */
  jummahTime: string | null;
  notes: string | null;
}

/**
 * `submitter` is null for a logged-out visitor, which the anon RLS policy
 * requires. `contact` is an optional name/email they can leave for follow-up;
 * it's ignored when signed in, since submitted_by carries the account email.
 */
export async function submitMasjidSuggestion(
  input: NewMasjidSuggestion,
  submitter: { id: string; email: string } | null,
  contact?: string | null,
): Promise<void> {
  const { error } = await requireClient().from("masjid_suggestions").insert({
    name: input.name,
    address: input.address,
    borough: input.borough,
    neighborhood: input.neighborhood,
    phone: input.phone,
    website: input.website,
    jummah_time: input.jummahTime,
    notes: input.notes,
    user_id: submitter?.id ?? null,
    submitted_by: submitter?.email ?? contact ?? null,
  });
  if (error) throw new Error(`Could not submit suggestion: ${error.message}`);
}

/** Admin only (RLS enforced — anon has no select grant at all). */
export async function listPendingMasjidSuggestions(): Promise<MasjidSuggestion[]> {
  const { data, error } = await requireClient()
    .from("masjid_suggestions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as MasjidSuggestionRow[]).map(toMasjidSuggestion);
}

/** Admin only. Used to prefill the masjid form when approving a suggestion. */
export async function fetchMasjidSuggestion(id: string): Promise<MasjidSuggestion | null> {
  const { data, error } = await requireClient()
    .from("masjid_suggestions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toMasjidSuggestion(data as unknown as MasjidSuggestionRow) : null;
}
