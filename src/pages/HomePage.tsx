import { useState } from "react";
import { MasjidList } from "@/components/masjid/MasjidList";
import { RecommendationCard } from "@/components/masjid/RecommendationCard";
import { SearchBar } from "@/components/search/SearchBar";
import { Button } from "@/components/ui";
import { useDebounce } from "@/hooks/useDebounce";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useMasjids } from "@/hooks/useMasjids";
import { useNow } from "@/hooks/useNow";
import { recommendBestJummah } from "@/lib/jummah";

/**
 * One question, answered top to bottom: "Where is the best nearby masjid
 * for me to attend Jummah right now?"
 *   1. Location prompt (the default search method)
 *   2. Recommendation — the best khutbah still reachable today
 *   3. Sticky search
 *   4. Nearby masjids, sorted by distance
 */
export function HomePage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const now = useNow();
  const { coordinates, status, requestLocation } = useGeolocation();
  const { masjids, isLoading, error } = useMasjids({
    origin: coordinates,
    search: debouncedSearch,
  });

  const recommendation =
    coordinates && !debouncedSearch ? recommendBestJummah(masjids, now) : null;

  return (
    <div className="space-y-4 px-4 pt-4">
      {status !== "granted" && (
        <section
          aria-label="Location"
          className="rounded-card border border-line bg-paper-raised p-4"
        >
          <h2 className="font-display text-lg font-semibold text-night">
            Find Jummah near you
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {status === "denied"
              ? "Location is off. Enable it in your browser settings, then reload — or search below."
              : status === "unavailable"
                ? "Location isn't available on this device. Search by masjid or neighborhood below."
                : "Share your location to see the closest masjids and which khutbah you can still make."}
          </p>
          {(status === "idle" || status === "locating") && (
            <Button
              onClick={requestLocation}
              disabled={status === "locating"}
              className="mt-3 w-full"
            >
              {status === "locating" ? "Locating…" : "Use my location"}
            </Button>
          )}
        </section>
      )}

      {recommendation && <RecommendationCard recommendation={recommendation} />}

      <section aria-label="Search" className="sticky top-14 z-10 -mx-4 bg-paper px-4 py-2">
        <SearchBar value={search} onChange={setSearch} />
      </section>

      <section aria-label="Nearby masjids">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold text-night">
            {coordinates ? "Nearest to you" : "Masjids in NYC"}
          </h2>
          {!isLoading && !error && (
            <span className="text-xs tabular-nums text-ink-faint">
              {masjids.length} listed
            </span>
          )}
        </div>
        <MasjidList
          masjids={masjids}
          now={now}
          isLoading={isLoading}
          error={error}
          searchTerm={debouncedSearch}
        />
      </section>
    </div>
  );
}
