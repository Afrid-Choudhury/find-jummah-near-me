import { supabase } from "@/lib/supabase";
import type {
  JummahTimeInsert,
  MasjidInsert,
  MasjidUpdate,
} from "@/types/database";

/**
 * Admin CRUD. Every function requires a signed-in admin — enforced by RLS
 * (see 0002_confidence_and_admin.sql), so even a modified client can't
 * write without an admin_users row. These calls are only reachable from
 * routes behind <AdminGuard>.
 */

function requireClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Admin tools need a live backend.");
  }
  return supabase;
}

export async function checkIsAdmin(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("is_admin");
  if (error) return false;
  return data === true;
}

export async function createMasjid(input: MasjidInsert): Promise<string> {
  const client = requireClient();
  const { data, error } = await client
    .from("masjids")
    .insert(input)
    .select("id")
    .single();
  if (error) throw new Error(`Could not create masjid: ${error.message}`);
  return (data as { id: string }).id;
}

export async function updateMasjid(id: string, input: MasjidUpdate): Promise<void> {
  const client = requireClient();
  const { error } = await client.from("masjids").update(input).eq("id", id);
  if (error) throw new Error(`Could not update masjid: ${error.message}`);
}

export async function deleteMasjid(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from("masjids").delete().eq("id", id);
  if (error) throw new Error(`Could not delete masjid: ${error.message}`);
}

export async function addJummahTime(input: JummahTimeInsert): Promise<void> {
  const client = requireClient();
  const { error } = await client.from("jummah_times").insert(input);
  if (error) throw new Error(`Could not add Jummah time: ${error.message}`);
}

export async function updateJummahTime(
  id: string,
  input: Partial<JummahTimeInsert>,
): Promise<void> {
  const client = requireClient();
  const { error } = await client.from("jummah_times").update(input).eq("id", id);
  if (error) throw new Error(`Could not update Jummah time: ${error.message}`);
}

export async function deleteJummahTime(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from("jummah_times").delete().eq("id", id);
  if (error) throw new Error(`Could not delete Jummah time: ${error.message}`);
}

/** "Mark verified" = stamp the schedule with today's date. */
export async function markTimeVerified(id: string): Promise<void> {
  await updateJummahTime(id, { last_verified_at: new Date().toISOString() });
}

/* ---------------------------------------------------------------------------
 * Review & suggestions (migration 0003)
 * ------------------------------------------------------------------------- */

/**
 * "Mark reviewed" — stamps last_reviewed_at so the confidence view only
 * counts 👍/👎 that arrive after this moment. History is preserved.
 */
export async function markMasjidReviewed(id: string): Promise<void> {
  await updateMasjid(id, { last_reviewed_at: new Date().toISOString() });
}

/**
 * Approve a suggestion: upsert it into jummah_times (matching on the
 * masjid's khutbah number), stamp it verified, and close the suggestion.
 */
export async function approveSuggestion(suggestion: {
  id: string;
  masjidId: string;
  khutbahNumber: number;
  khutbahTime: string;
  iqamahTime: string | null;
  language: string;
  notes: string | null;
}): Promise<void> {
  const client = requireClient();
  const now = new Date().toISOString();

  const { data: existing, error: lookupError } = await client
    .from("jummah_times")
    .select("id")
    .eq("masjid_id", suggestion.masjidId)
    .eq("khutbah_number", suggestion.khutbahNumber)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);

  const fields = {
    khutbah_time: suggestion.khutbahTime,
    iqamah_time: suggestion.iqamahTime,
    language: suggestion.language,
    notes: suggestion.notes,
    last_verified_at: now,
  };

  if (existing) {
    await updateJummahTime((existing as { id: string }).id, fields);
  } else {
    await addJummahTime({
      masjid_id: suggestion.masjidId,
      khutbah_number: suggestion.khutbahNumber,
      ...fields,
    });
  }

  const { error } = await client
    .from("time_suggestions")
    .update({ status: "approved", reviewed_at: now })
    .eq("id", suggestion.id);
  if (error) throw new Error(`Time saved but could not close suggestion: ${error.message}`);
}

export async function rejectSuggestion(id: string): Promise<void> {
  const { error } = await requireClient()
    .from("time_suggestions")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Could not reject suggestion: ${error.message}`);
}
