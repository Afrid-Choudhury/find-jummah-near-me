import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMasjidBySlug, fetchMasjids } from "@/services/masjidService";
import { distanceMiles } from "@/lib/utils";
import type { Coordinates, MasjidWithDistance } from "@/types";

export const masjidKeys = {
  all: ["masjids"] as const,
  detail: (slug: string) => ["masjids", slug] as const,
};

interface UseMasjidsOptions {
  /** User position; when present, results are annotated + sorted by distance. */
  origin: Coordinates | null;
  /** Free-text filter across name, neighborhood, borough, address. */
  search: string;
}

export function useMasjids({ origin, search }: UseMasjidsOptions) {
  const query = useQuery({
    queryKey: masjidKeys.all,
    queryFn: fetchMasjids,
  });

  const masjids: MasjidWithDistance[] = useMemo(() => {
    const list = query.data ?? [];
    const term = search.trim().toLowerCase();

    return list
      .map((masjid) => ({
        ...masjid,
        distanceMiles: origin ? distanceMiles(origin, masjid.coordinates) : null,
      }))
      .filter((masjid) => {
        if (!term) return true;
        return [masjid.name, masjid.neighborhood ?? "", masjid.borough, masjid.address]
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => {
        if (a.distanceMiles !== null && b.distanceMiles !== null) {
          return a.distanceMiles - b.distanceMiles;
        }
        return a.name.localeCompare(b.name);
      });
  }, [query.data, origin, search]);

  return { ...query, masjids };
}

export function useMasjid(slug: string) {
  return useQuery({
    queryKey: masjidKeys.detail(slug),
    queryFn: () => fetchMasjidBySlug(slug),
    enabled: slug.length > 0,
  });
}
