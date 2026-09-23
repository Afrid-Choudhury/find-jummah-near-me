import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, Skeleton } from "@/components/ui";
import { useMasjids } from "@/hooks/useMasjids";
import { SearchBar } from "@/components/search/SearchBar";
import { formatTime, formatVerifiedDate } from "@/lib/jummah";
import { listPendingMasjidSuggestions } from "@/services/masjidSuggestionService";
import { listPendingSuggestions } from "@/services/suggestionService";
import type { MasjidWithDistance } from "@/types";

/**
 * Admin home, organized as a work queue:
 *   1. Pending community suggestions (one tap to review)
 *   2. Data-entry checklist — masjids with no times yet, phone inline so you
 *      can call straight down the list
 *   3. All masjids, needs-review first (most reports, then stalest verification)
 */
export function AdminDashboardPage() {
  const [search, setSearch] = useState("");
  const { masjids, isLoading } = useMasjids({ origin: null, search });
  const pending = useQuery({ queryKey: ["pending-suggestions"], queryFn: listPendingSuggestions });
  const pendingMasjids = useQuery({
    queryKey: ["pending-masjid-suggestions"],
    queryFn: listPendingMasjidSuggestions,
  });

  // Community times the crowd rejected. They're kept out of `jummahTimes` so
  // the public never sees them, which is exactly why they need surfacing here.
  const retracted = masjids.flatMap((masjid) =>
    masjid.retractedTimes.map((time) => ({ masjid, time })),
  );

  const missingTimes = masjids
    .filter((m) => m.jummahTimes.length === 0)
    .sort((a, b) => a.borough.localeCompare(b.borough) || a.name.localeCompare(b.name));

  const withTimes = masjids
    .filter((m) => m.jummahTimes.length > 0)
    .sort((a, b) => {
      if (b.reports !== a.reports) return b.reports - a.reports;
      return (a.lastVerifiedAt ?? "").localeCompare(b.lastVerifiedAt ?? "");
    });

  return (
    <div className="space-y-4 px-4 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-night">Admin</h1>
        <Link to="/admin/new" className="rounded-full bg-night px-4 py-2 text-sm font-medium text-paper">
          Add masjid
        </Link>
      </div>

      {retracted.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">
            Taken down by the community
          </h2>
          <ul className="space-y-2">
            {retracted.map(({ masjid, time }) => (
              <li key={time.id}>
                <Card className="p-3">
                  <Link to={`/admin/masjid/${masjid.id}`} className="block">
                    <p className="truncate font-medium text-night">{masjid.name}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Khutbah {time.khutbahNumber} · {formatTime(time.khutbahTime)} —
                      hidden from the site after {time.reports}{" "}
                      {time.reports === 1 ? "report" : "reports"} against{" "}
                      {time.confirmations}{" "}
                      {time.confirmations === 1 ? "confirmation" : "confirmations"}.
                    </p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      Fix it and mark it verified, or remove it.
                    </p>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SuggestionsCard
        timeCount={pending.data?.length ?? 0}
        masjidCount={pendingMasjids.data?.length ?? 0}
        isLoading={pending.isLoading || pendingMasjids.isLoading}
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Search masjids" />

      {isLoading ? (
        <Skeleton className="h-64 rounded-card" />
      ) : (
        <>
          {missingTimes.length > 0 && (
            <section>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Needs Jummah times
                </h2>
                <span className="text-xs tabular-nums text-ink-faint">{missingTimes.length} left</span>
              </div>
              <ul className="space-y-2">
                {missingTimes.map((m) => <ChecklistRow key={m.id} masjid={m} />)}
              </ul>
            </section>
          )}

          {withTimes.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Listed · needs review first
              </h2>
              <ul className="space-y-2">
                {withTimes.map((m) => <ListedRow key={m.id} masjid={m} />)}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** Both review queues at a glance: suggested times and suggested masjids. */
function SuggestionsCard({
  timeCount,
  masjidCount,
  isLoading,
}: {
  timeCount: number;
  masjidCount: number;
  isLoading: boolean;
}) {
  const total = timeCount + masjidCount;
  return (
    <Link to="/admin/suggestions" className="block">
      <Card className="flex items-center justify-between p-4">
        <div>
          <p className="font-medium text-night">Community suggestions</p>
          <p className="text-xs text-ink-muted">
            {isLoading
              ? "Loading…"
              : total === 0
                ? "Nothing waiting for review"
                : `${timeCount} time${timeCount === 1 ? "" : "s"} · ${masjidCount} new masjid${masjidCount === 1 ? "" : "s"}`}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${
            total > 0 ? "bg-saffron-soft text-saffron-deep" : "bg-paper-sunken text-ink-faint"
          }`}
        >
          {total}
        </span>
      </Card>
    </Link>
  );
}

function ChecklistRow({ masjid }: { masjid: MasjidWithDistance }) {
  const tel = masjid.phone ? `tel:${masjid.phone.replace(/[^+\d]/g, "")}` : null;
  return (
    <li>
      <Card className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <Link to={`/admin/masjid/${masjid.id}`} className="block truncate font-medium text-night">
            {masjid.name}
          </Link>
          <p className="truncate text-xs text-ink-muted">
            {masjid.neighborhood ? `${masjid.neighborhood} · ` : ""}{masjid.borough}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {tel && (
            <a href={tel} className="rounded-full border border-line bg-paper-raised px-3 py-1.5 text-xs font-medium text-night">
              Call
            </a>
          )}
          <Link to={`/admin/masjid/${masjid.id}`} className="rounded-full bg-saffron px-3 py-1.5 text-xs font-semibold text-night">
            Add times
          </Link>
        </div>
      </Card>
    </li>
  );
}

function ListedRow({ masjid }: { masjid: MasjidWithDistance }) {
  return (
    <li>
      <Card className="p-3">
        <Link to={`/admin/masjid/${masjid.id}`} className="block">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-night">{masjid.name}</p>
              <p className="truncate text-xs text-ink-muted">
                {masjid.jummahTimes.length} time{masjid.jummahTimes.length === 1 ? "" : "s"} ·{" "}
                {masjid.lastVerifiedAt ? `verified ${formatVerifiedDate(masjid.lastVerifiedAt)}` : "never verified"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs tabular-nums">
              <span className="text-ink-muted">👍 {masjid.confirmations}</span>
              <span className={masjid.reports > 0 ? "font-semibold text-red-700" : "text-ink-muted"}>
                👎 {masjid.reports}
              </span>
            </div>
          </div>
        </Link>
      </Card>
    </li>
  );
}
