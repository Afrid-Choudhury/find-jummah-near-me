import { useState } from "react";
import { MasjidMap } from "@/components/map/MasjidMap";
import { MasjidList, masjidCardId } from "@/components/masjid/MasjidList";
import { RecommendationCard } from "@/components/masjid/RecommendationCard";
import { SearchBar } from "@/components/search/SearchBar";
import { Button } from "@/components/ui";
import { useDebounce } from "@/hooks/useDebounce";
import { useGeolocation } from "@/hooks/useGeolocation";
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery";
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
 *
 * On desktop that column becomes the left pane and a map of the same results
 * fills the rest of the screen, linked both ways: hovering a card enlarges its
 * pin, clicking a pin scrolls to its card. Phones never mount the map.
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
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  // Hover is transient; a pin click sticks until the next one.
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = hoveredId ?? selectedId;

  const withTimesCount = masjids.filter((m) => m.jummahTimes.length > 0).length;

  const recommendation =
    coordinates && !debouncedSearch ? recommendBestJummah(masjids, now) : null;

  function selectFromMap(id: string) {
    setSelectedId(id);
    document
      .getElementById(masjidCardId(id))
      ?.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <div className="lg:grid lg:grid-cols-[26rem_minmax(0,1fr)] xl:grid-cols-[30rem_minmax(0,1fr)]">
      <div className="space-y-4 px-4 pt-4 md:mx-auto md:max-w-3xl lg:mx-0 lg:max-w-none">
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

        {/* Offset = header height: two rows on phones, one from md (see Header) */}
        <section
          aria-label="Search"
          className="sticky top-[5.5rem] z-10 -mx-4 bg-paper px-4 py-2 md:top-14"
        >
          <SearchBar value={search} onChange={setSearch} />
        </section>

        <section aria-label="Nearby masjids">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold text-night">
              {coordinates ? "Nearest to you" : "Masjids in NYC"}
            </h2>
            {!isLoading && !error && (
              <span className="text-xs tabular-nums text-ink-faint">
                {masjids.length} listed · {withTimesCount} with times
              </span>
            )}
          </div>
          <MasjidList
            masjids={masjids}
            now={now}
            isLoading={isLoading}
            error={error}
            searchTerm={debouncedSearch}
            // Highlighting only means something with a map beside the list
            {...(isDesktop && { activeId, onActiveChange: setHoveredId })}
          />
        </section>
      </div>

      {isDesktop && (
        <aside aria-label="Map" className="pr-4 pt-4">
          {/* Header is 3.5rem; 1rem gap above and below the map */}
          <div className="sticky top-[4.5rem] h-[calc(100dvh-5.5rem)]">
            <MasjidMap
              masjids={masjids}
              isLoading={isLoading}
              origin={coordinates}
              activeId={activeId}
              onHoverChange={setHoveredId}
              onSelect={selectFromMap}
            />
          </div>
        </aside>
      )}
    </div>
  );
}
