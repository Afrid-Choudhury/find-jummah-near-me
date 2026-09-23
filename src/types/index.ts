import type {
  ConfidenceRow,
  JummahTimeRow,
  MasjidRow,
  MasjidSuggestionRow,
  TimeConfidenceRow,
  TimeSuggestionRow,
} from "./database";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Domain model: a masjid with its Jummah schedule and community confidence
 * attached. Components consume this shape, never raw DB rows — the mapping
 * happens once in the service layer, so a schema change touches one file.
 */
export interface Masjid {
  id: string;
  name: string;
  slug: string;
  address: string;
  borough: string;
  neighborhood: string | null;
  coordinates: Coordinates;
  phone: string | null;
  website: string | null;
  capacity: number | null;
  hasWomensSection: boolean;
  /** Publicly visible schedules — retracted community times are excluded. */
  jummahTimes: JummahTime[];
  /** Community times the crowd rejected: hidden publicly, shown to admins. */
  retractedTimes: JummahTime[];
  /** Most recent verification across all this masjid's schedules. */
  lastVerifiedAt: string | null;
  /** Community confidence counters (append-only signals, never edits). */
  confirmations: number;
  reports: number;
  /** When an admin last reviewed this listing (resets confidence counters). */
  lastReviewedAt: string | null;
}

export type SuggestionStatus = "pending" | "approved" | "rejected";

/**
 * A proposed masjid that isn't in the directory yet. Coordinates are present
 * only when the submitter pasted a map link we could read; an admin confirms
 * or supplies them when creating the real listing.
 */
export interface MasjidSuggestion {
  id: string;
  name: string;
  address: string;
  borough: string | null;
  neighborhood: string | null;
  phone: string | null;
  website: string | null;
  coordinates: Coordinates | null;
  /** Raw pasted link, kept even when it didn't parse (e.g. a short link). */
  mapLink: string | null;
  jummahTime: string | null;
  notes: string | null;
  submittedBy: string | null;
  status: SuggestionStatus;
  createdAt: string;
}

/** A user-proposed Jummah time awaiting (or past) admin review. */
export interface TimeSuggestion {
  id: string;
  masjidId: string;
  submittedBy: string | null;
  khutbahNumber: number;
  khutbahTime: string;
  iqamahTime: string | null;
  language: string;
  notes: string | null;
  status: SuggestionStatus;
  createdAt: string;
}

/**
 * Where a schedule came from. `admin` is entered through the dashboard;
 * `community` was published from a suggestion without anyone confirming it
 * by phone, and must never be displayed as though it were verified.
 */
export type JummahTimeSource = "admin" | "community";

export interface JummahTime {
  id: string;
  khutbahNumber: number;
  /** 24h time string, e.g. "13:15:00" */
  khutbahTime: string;
  iqamahTime: string | null;
  language: string;
  notes: string | null;
  /** Set only when an admin personally confirmed it. */
  lastVerifiedAt: string | null;
  source: JummahTimeSource;
  /** Per-schedule votes, since the last admin review of the listing. */
  confirmations: number;
  reports: number;
  /** The crowd says this is wrong — hidden publicly, kept for the admin. */
  isRetracted: boolean;
}

/** Minimum reports before the crowd can retract a community time. */
const RETRACTION_MIN_REPORTS = 2;

/**
 * A community time retracts itself once enough people say it's wrong and
 * they outnumber those who say it's right. One disagreement isn't enough —
 * that's noise, and a correct time shouldn't vanish on a single bad vote.
 *
 * Verified times never retract: an admin confirmed those personally, so
 * reports flag them for review instead (see `Masjid.reports`).
 */
export function isTimeRetracted(
  source: JummahTimeSource,
  confirmations: number,
  reports: number,
): boolean {
  if (source !== "community") return false;
  return reports >= RETRACTION_MIN_REPORTS && reports > confirmations;
}

/** A masjid annotated with its distance from the user, in miles. */
export interface MasjidWithDistance extends Masjid {
  distanceMiles: number | null;
}

export type GeolocationStatus = "idle" | "locating" | "granted" | "denied" | "unavailable";

/* ----- Row -> domain mappers ----- */

export function toJummahTime(
  row: JummahTimeRow,
  confidence?: Pick<TimeConfidenceRow, "confirmations" | "reports">,
): JummahTime {
  const confirmations = confidence?.confirmations ?? 0;
  const reports = confidence?.reports ?? 0;
  return {
    id: row.id,
    khutbahNumber: row.khutbah_number,
    khutbahTime: row.khutbah_time,
    iqamahTime: row.iqamah_time,
    language: row.language,
    notes: row.notes,
    lastVerifiedAt: row.last_verified_at,
    source: row.source,
    confirmations,
    reports,
    isRetracted: isTimeRetracted(row.source, confirmations, reports),
  };
}

export function toMasjid(
  row: MasjidRow,
  times: JummahTimeRow[],
  confidence?: Pick<ConfidenceRow, "confirmations" | "reports">,
  timeConfidence?: Map<string, Pick<TimeConfidenceRow, "confirmations" | "reports">>,
): Masjid {
  const allTimes = times
    .slice()
    .sort((a, b) => a.khutbah_number - b.khutbah_number)
    .map((time) => toJummahTime(time, timeConfidence?.get(time.id)));

  // Retracted times are split off rather than dropped: the public surfaces
  // (and the recommendation engine) only ever read `jummahTimes`, while the
  // admin still needs to see and fix what the crowd rejected.
  const jummahTimes = allTimes.filter((time) => !time.isRetracted);
  const retractedTimes = allTimes.filter((time) => time.isRetracted);

  const lastVerifiedAt = jummahTimes.reduce<string | null>(
    (latest, t) =>
      t.lastVerifiedAt && (!latest || t.lastVerifiedAt > latest) ? t.lastVerifiedAt : latest,
    null,
  );

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    address: row.address,
    borough: row.borough,
    neighborhood: row.neighborhood,
    coordinates: { latitude: row.latitude, longitude: row.longitude },
    phone: row.phone,
    website: row.website,
    capacity: row.capacity,
    hasWomensSection: row.has_womens_section,
    jummahTimes,
    retractedTimes,
    lastVerifiedAt,
    confirmations: confidence?.confirmations ?? 0,
    reports: confidence?.reports ?? 0,
    lastReviewedAt: row.last_reviewed_at,
  };
}

export function toMasjidSuggestion(row: MasjidSuggestionRow): MasjidSuggestion {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    borough: row.borough,
    neighborhood: row.neighborhood,
    phone: row.phone,
    website: row.website,
    coordinates:
      row.latitude !== null && row.longitude !== null
        ? { latitude: row.latitude, longitude: row.longitude }
        : null,
    mapLink: row.map_link,
    jummahTime: row.jummah_time,
    notes: row.notes,
    submittedBy: row.submitted_by,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function toTimeSuggestion(row: TimeSuggestionRow): TimeSuggestion {
  return {
    id: row.id,
    masjidId: row.masjid_id,
    submittedBy: row.submitted_by,
    khutbahNumber: row.khutbah_number,
    khutbahTime: row.khutbah_time,
    iqamahTime: row.iqamah_time,
    language: row.language,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
  };
}
