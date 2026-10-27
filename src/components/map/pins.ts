import { isVerifiedTime, type Masjid } from "@/types";

/**
 * Shared by the street map's markers, the fallback plot and the legend, so a
 * pin can never look more certain than the times on its card.
 */
export type PinTier = "verified" | "community" | "none";

/** Draw order: quieter tiers underneath. */
export const TIER_ORDER: Record<PinTier, number> = { none: 0, community: 1, verified: 2 };

/**
 * Same tiers as the list's no-location order (completenessRank in useMasjids).
 * Once seasonal times (0011) land, judge only the rows in effect this Friday,
 * as MasjidCard does — a verified summer row says nothing about winter.
 */
export function pinTier(masjid: Masjid): PinTier {
  if (masjid.jummahTimes.length === 0) return "none";
  return masjid.jummahTimes.some(isVerifiedTime) ? "verified" : "community";
}

/** Saffron only for verified times — the same rule as JummahTimeBadge. */
export const PIN_DOT_CLASS: Record<PinTier, string> = {
  verified: "h-3.5 w-3.5 border-2 border-saffron-deep bg-saffron",
  community: "h-3.5 w-3.5 border-2 border-dashed border-night bg-paper-raised",
  none: "h-2.5 w-2.5 border border-paper-raised bg-ink-faint",
};
