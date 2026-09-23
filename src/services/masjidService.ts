import { supabase } from "@/lib/supabase";
import { MOCK_MASJIDS } from "@/data/mockMasjids";
import { toMasjid, type Masjid } from "@/types";
import type {
  ConfidenceRow,
  JummahTimeRow,
  MasjidRow,
  TimeConfidenceRow,
} from "@/types/database";

/**
 * Data-access layer for public reads. Pages/hooks call these and never touch
 * the Supabase client directly — the single seam for swapping mock <-> live
 * data and for future backends.
 *
 * Note on casts: src/types/database.ts is hand-written without Relationships
 * metadata, so the client can't infer embedded selects like jummah_times(*).
 * We assert the shape once here; it disappears when you switch to generated
 * types (`supabase gen types typescript`).
 */

type MasjidWithTimesRow = MasjidRow & { jummah_times: JummahTimeRow[] | null };

const MASJID_SELECT = "*, jummah_times(*)";

async function fetchConfidenceMap(): Promise<Map<string, ConfidenceRow>> {
  if (!supabase) return new Map();
  const { data, error } = await supabase.from("masjid_confidence").select("*");
  if (error) {
    // Confidence is enhancement data — a failure shouldn't block the list.
    console.warn("Could not load confidence counts:", error.message);
    return new Map();
  }
  const rows = (data ?? []) as unknown as ConfidenceRow[];
  return new Map(rows.map((row) => [row.masjid_id, row]));
}

/**
 * Per-schedule votes. This is what decides whether a community time is
 * retracted, so a failure here would silently make rejected times reappear —
 * the mapper treats a missing entry as zero votes. Degrading loudly in the
 * console is the best available middle ground: the page still renders.
 */
async function fetchTimeConfidenceMap(): Promise<Map<string, TimeConfidenceRow>> {
  if (!supabase) return new Map();
  const { data, error } = await supabase.from("jummah_time_confidence").select("*");
  if (error) {
    console.warn("Could not load per-time confidence:", error.message);
    return new Map();
  }
  const rows = (data ?? []) as unknown as TimeConfidenceRow[];
  return new Map(rows.map((row) => [row.jummah_time_id, row]));
}

export async function fetchMasjids(): Promise<Masjid[]> {
  if (!supabase) {
    return Promise.resolve(MOCK_MASJIDS); // local dev fallback, no env needed
  }

  const [masjidResult, confidence, timeConfidence] = await Promise.all([
    supabase.from("masjids").select(MASJID_SELECT).order("name"),
    fetchConfidenceMap(),
    fetchTimeConfidenceMap(),
  ]);

  if (masjidResult.error) {
    throw new Error(`Failed to load masjids: ${masjidResult.error.message}`);
  }

  const rows = (masjidResult.data ?? []) as unknown as MasjidWithTimesRow[];
  return rows.map(({ jummah_times, ...masjidRow }) =>
    toMasjid(masjidRow, jummah_times ?? [], confidence.get(masjidRow.id), timeConfidence),
  );
}

export async function fetchMasjidBySlug(slug: string): Promise<Masjid | null> {
  if (!supabase) {
    return Promise.resolve(MOCK_MASJIDS.find((m) => m.slug === slug) ?? null);
  }

  const [masjidResult, confidence, timeConfidence] = await Promise.all([
    supabase.from("masjids").select(MASJID_SELECT).eq("slug", slug).maybeSingle(),
    fetchConfidenceMap(),
    fetchTimeConfidenceMap(),
  ]);

  if (masjidResult.error) {
    throw new Error(`Failed to load masjid: ${masjidResult.error.message}`);
  }
  if (!masjidResult.data) return null;

  const { jummah_times, ...masjidRow } =
    masjidResult.data as unknown as MasjidWithTimesRow;
  return toMasjid(masjidRow, jummah_times ?? [], confidence.get(masjidRow.id), timeConfidence);
}
