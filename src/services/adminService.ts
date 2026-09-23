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

/**
 * "Mark verified" = stamp the schedule with today's date. Also promotes a
 * community time to 'admin': verifying it is exactly the act of taking
 * responsibility for it, so it should stop being labelled unverified.
 */
export async function markTimeVerified(id: string): Promise<void> {
  await updateJummahTime(id, {
    last_verified_at: new Date().toISOString(),
    source: "admin",
  });
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
    // Explicit: approving an existing community time promotes it to admin.
    source: "admin" as const,
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

/**
 * The fast path: publish a suggested time without claiming to have checked
 * it. Writes source 'community' with last_verified_at deliberately null, so
 * the public UI labels it unverified and visitors can confirm or dispute it.
 *
 * Distinct from approveSuggestion, which stamps it verified — that one says
 * "I confirmed this myself."
 */
export async function publishSuggestionAsCommunityTime(suggestion: {
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
    source: "community" as const,
    last_verified_at: null,
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
  if (error) {
    throw new Error(`Time published but could not close suggestion: ${error.message}`);
  }
}

export async function rejectSuggestion(id: string): Promise<void> {
  const { error } = await requireClient()
    .from("time_suggestions")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Could not reject suggestion: ${error.message}`);
}

/* ---------------------------------------------------------------------------
 * Suggested new masjids (migration 0008)
 *
 * Approval deliberately isn't an insert here: `masjids` requires latitude and
 * longitude under CHECK constraints and a suggestion carries neither, so the
 * admin form creates the masjid and then closes the suggestion with these.
 * ------------------------------------------------------------------------- */

export async function approveMasjidSuggestion(id: string): Promise<void> {
  const { error } = await requireClient()
    .from("masjid_suggestions")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Could not close suggestion: ${error.message}`);
}

export async function rejectMasjidSuggestion(id: string): Promise<void> {
  const { error } = await requireClient()
    .from("masjid_suggestions")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Could not reject suggestion: ${error.message}`);
}

/* ---------------------------------------------------------------------------
 * Masjid editors (migration 0007)
 *
 * An editor maintains one masjid's times directly, skipping the suggestion
 * queue. Granting and revoking is admin-only, enforced by RLS and re-checked
 * inside the security-definer functions these call.
 * ------------------------------------------------------------------------- */

export interface MasjidEditor {
  userId: string;
  email: string;
  createdAt: string;
}

export async function listMasjidEditors(masjidId: string): Promise<MasjidEditor[]> {
  const { data, error } = await requireClient().rpc("list_masjid_editors", {
    target_masjid_id: masjidId,
  });
  if (error) throw new Error(`Could not load editors: ${error.message}`);
  const rows = (data ?? []) as { user_id: string; email: string; created_at: string }[];
  return rows.map((row) => ({
    userId: row.user_id,
    email: row.email,
    createdAt: row.created_at,
  }));
}

/** The person must already have an account — the lookup is by email. */
export async function grantMasjidEditor(masjidId: string, email: string): Promise<void> {
  const { error } = await requireClient().rpc("grant_masjid_editor", {
    editor_email: email,
    target_masjid_id: masjidId,
  });
  if (error) throw new Error(error.message);
}

export async function revokeMasjidEditor(masjidId: string, userId: string): Promise<void> {
  const { error } = await requireClient()
    .from("masjid_editors")
    .delete()
    .eq("masjid_id", masjidId)
    .eq("user_id", userId);
  if (error) throw new Error(`Could not revoke editor access: ${error.message}`);
}
