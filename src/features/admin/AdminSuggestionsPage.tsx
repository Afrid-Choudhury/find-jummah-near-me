import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button, Card, Skeleton } from "@/components/ui";
import { masjidKeys, useMasjids } from "@/hooks/useMasjids";
import { formatTime } from "@/lib/jummah";
import * as admin from "@/services/adminService";
import { listPendingMasjidSuggestions } from "@/services/masjidSuggestionService";
import { listPendingSuggestions } from "@/services/suggestionService";
import type { Masjid, MasjidSuggestion, TimeSuggestion } from "@/types";

/**
 * Words that appear in most masjid names and so carry no signal when looking
 * for a duplicate.
 */
const GENERIC_NAME_WORDS = new Set([
  "masjid", "mosque", "islamic", "center", "centre", "community", "cultural",
  "society", "foundation", "institute", "inc", "the", "and", "of", "jame",
]);

/**
 * A submitted link is untrusted text. Only http(s) may become an href —
 * otherwise a `javascript:` URL pasted into the public form would run when an
 * admin clicked it. Anything else is shown as plain text.
 */
function safeHttpUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/** The submitted link, clickable when it's safe to be. */
function SubmittedMapLink({ raw }: { raw: string }) {
  const href = safeHttpUrl(raw);
  return (
    <div>
      <p className="text-xs text-ink-faint">Submitted map link</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="break-all text-sm font-medium text-night underline"
        >
          {raw}
        </a>
      ) : (
        <p className="break-all text-sm text-ink-muted">{raw}</p>
      )}
    </div>
  );
}

interface MasjidSuggestionCardProps {
  suggestion: MasjidSuggestion;
  similar: Masjid[];
  busy: boolean;
  onReject: () => void;
}

/**
 * Approve is a link, not an action: `masjids` needs latitude and longitude
 * under CHECK constraints and a suggestion has neither, so this hands the
 * values to the masjid form and the admin fills in the coordinates there.
 * Saving that form is what closes this suggestion.
 */
function MasjidSuggestionCard({
  suggestion,
  similar,
  busy,
  onReject,
}: MasjidSuggestionCardProps) {
  const detail = (label: string, value: string | null) =>
    value ? (
      <div>
        <dt className="text-xs text-ink-faint">{label}</dt>
        <dd className="text-sm text-night">{value}</dd>
      </div>
    ) : null;

  return (
    <Card className="space-y-3 p-4">
      <div>
        <p className="font-medium text-night">{suggestion.name}</p>
        <p className="text-sm text-ink-muted">{suggestion.address}</p>
        <p className="mt-1 text-xs text-ink-muted">
          from {suggestion.submittedBy ?? "an anonymous visitor"} ·{" "}
          {new Date(suggestion.createdAt).toLocaleDateString()}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        {detail("Borough", suggestion.borough)}
        {detail("Neighborhood", suggestion.neighborhood)}
        {detail("Jummah time", suggestion.jummahTime ? formatTime(suggestion.jummahTime) : null)}
        {detail("Phone", suggestion.phone)}
        {detail("Website", suggestion.website)}
        {detail(
          "Coordinates",
          suggestion.coordinates
            ? `${suggestion.coordinates.latitude}, ${suggestion.coordinates.longitude}`
            : suggestion.mapLink
              ? "Link didn't resolve — open it below"
              : "Not provided",
        )}
      </dl>

      {suggestion.mapLink && <SubmittedMapLink raw={suggestion.mapLink} />}

      {suggestion.notes && (
        <p className="text-sm text-ink-muted">&ldquo;{suggestion.notes}&rdquo;</p>
      )}

      {similar.length > 0 && (
        <div className="rounded-lg border border-saffron bg-saffron-soft/25 p-3">
          <p className="text-xs font-semibold uppercase text-saffron-deep">
            Possible duplicate
          </p>
          <ul className="mt-1 space-y-1">
            {similar.map((masjid) => (
              <li key={masjid.id}>
                <Link
                  to={`/admin/masjid/${masjid.id}`}
                  className="text-sm font-medium text-night underline"
                >
                  {masjid.name}
                </Link>
                <span className="block text-xs text-ink-muted">{masjid.address}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <Link
          to={`/admin/new?from_suggestion=${suggestion.id}`}
          className="inline-flex h-9 flex-1 items-center justify-center rounded-full bg-night px-4 text-sm font-medium text-paper"
        >
          Approve — add coordinates
        </Link>
        <Button size="sm" variant="secondary" disabled={busy} onClick={onReject}>
          Reject
        </Button>
      </div>
    </Card>
  );
}

function meaningfulWords(text: string, stopwords: Set<string>): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !stopwords.has(word));
}

/**
 * Existing masjids that look like they might already be this suggestion.
 * Name overlap counts double — two masjids on the same street are common,
 * two with the same distinctive name word usually means a duplicate.
 */
function similarMasjids(
  suggestion: MasjidSuggestion,
  masjids: Masjid[],
  limit = 3,
): Masjid[] {
  const nameWords = new Set(meaningfulWords(suggestion.name, GENERIC_NAME_WORDS));
  const addressWords = new Set(meaningfulWords(suggestion.address, new Set()));

  return masjids
    .map((masjid) => {
      const theirName = new Set(meaningfulWords(masjid.name, GENERIC_NAME_WORDS));
      const theirAddress = new Set(meaningfulWords(masjid.address, new Set()));
      let score = 0;
      nameWords.forEach((word) => {
        if (theirName.has(word)) score += 2;
      });
      addressWords.forEach((word) => {
        if (theirAddress.has(word)) score += 1;
      });
      return { masjid, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.masjid);
}

/**
 * Review queue. Each card shows the suggestion beside the masjid's current
 * schedule so you can see at a glance whether it's new info, a correction,
 * or a duplicate. Approve = write to jummah_times + stamp verified.
 */
export function AdminSuggestionsPage() {
  const queryClient = useQueryClient();
  const { masjids } = useMasjids({ origin: null, search: "" });
  const pending = useQuery({ queryKey: ["pending-suggestions"], queryFn: listPendingSuggestions });
  const pendingMasjids = useQuery({
    queryKey: ["pending-masjid-suggestions"],
    queryFn: listPendingMasjidSuggestions,
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (id: string, action: () => Promise<void>) => {
    setBusyId(id);
    setError(null);
    try {
      await action();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pending-suggestions"] }),
        queryClient.invalidateQueries({ queryKey: ["pending-masjid-suggestions"] }),
        queryClient.invalidateQueries({ queryKey: masjidKeys.all }),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 px-4 pt-4">
      <nav aria-label="Breadcrumb">
        <Link to="/admin" className="text-sm text-ink-muted hover:text-night">← Admin</Link>
      </nav>
      <h1 className="font-display text-xl font-semibold text-night">Community suggestions</h1>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Suggested new masjids
          </h2>
          {!pendingMasjids.isLoading && (
            <span className="text-xs tabular-nums text-ink-faint">
              {(pendingMasjids.data ?? []).length} waiting
            </span>
          )}
        </div>

        {pendingMasjids.isLoading ? (
          <Skeleton className="h-32 rounded-card" />
        ) : pendingMasjids.error ? (
          <p className="text-sm text-red-700">
            {pendingMasjids.error instanceof Error
              ? pendingMasjids.error.message
              : "Could not load suggestions."}
          </p>
        ) : (pendingMasjids.data ?? []).length === 0 ? (
          <Card className="p-5 text-center text-sm text-ink-muted">
            No new masjids suggested.
          </Card>
        ) : (
          <ul className="space-y-3">
            {pendingMasjids.data!.map((suggestion) => (
              <li key={suggestion.id}>
                <MasjidSuggestionCard
                  suggestion={suggestion}
                  similar={similarMasjids(suggestion, masjids)}
                  busy={busyId === suggestion.id}
                  onReject={() =>
                    void act(suggestion.id, () => admin.rejectMasjidSuggestion(suggestion.id))
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
        Suggested times for listed masjids
      </h2>

      {pending.isLoading ? (
        <Skeleton className="h-40 rounded-card" />
      ) : (pending.data ?? []).length === 0 ? (
        <Card className="p-5 text-center text-sm text-ink-muted">Queue is empty. Nice.</Card>
      ) : (
        <ul className="space-y-3">
          {pending.data!.map((s: TimeSuggestion) => {
            const masjid = masjids.find((m) => m.id === s.masjidId);
            const current = masjid?.jummahTimes.find((t) => t.khutbahNumber === s.khutbahNumber);
            const busy = busyId === s.id;
            return (
              <li key={s.id}>
                <Card className="space-y-3 p-4">
                  <div>
                    <p className="font-medium text-night">{masjid?.name ?? "Unknown masjid"}</p>
                    <p className="text-xs text-ink-muted">
                      from {s.submittedBy ?? "an anonymous visitor"} · {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-saffron-soft p-3">
                      <p className="text-xs font-semibold uppercase text-saffron-deep">Suggested</p>
                      <p className="mt-1 font-semibold tabular-nums text-night">
                        Khutbah {s.khutbahNumber} · {formatTime(s.khutbahTime)}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {s.iqamahTime ? `Iqamah ${formatTime(s.iqamahTime)} · ` : ""}{s.language}
                      </p>
                      {s.notes && <p className="mt-1 text-xs text-ink-muted">“{s.notes}”</p>}
                    </div>
                    <div className="rounded-lg bg-paper-sunken p-3">
                      <p className="text-xs font-semibold uppercase text-ink-faint">Currently listed</p>
                      {current ? (
                        <>
                          <p className="mt-1 font-semibold tabular-nums text-night">
                            Khutbah {current.khutbahNumber} · {formatTime(current.khutbahTime)}
                          </p>
                          <p className="text-xs text-ink-muted">{current.language}</p>
                        </>
                      ) : (
                        <p className="mt-1 text-ink-muted">Nothing for khutbah {s.khutbahNumber}</p>
                      )}
                    </div>
                  </div>

                  {/* Two publish paths, deliberately not interchangeable: one
                      claims you checked it, the other says the opposite. */}
                  <div className="space-y-2">
                    <div className="rounded-lg border border-saffron bg-saffron-soft/25 p-3">
                      <Button size="sm" disabled={busy} className="w-full"
                        onClick={() => void act(s.id, () => admin.approveSuggestion(s))}>
                        {current ? "Verify & replace" : "Verify & publish"}
                      </Button>
                      <p className="mt-1.5 text-xs text-ink-muted">
                        Says <strong className="font-medium text-night">you</strong> confirmed
                        this — stamps it verified and shows it as a verified time.
                      </p>
                    </div>

                    <div className="rounded-lg border border-dashed border-line bg-paper-sunken/40 p-3">
                      <Button size="sm" variant="secondary" disabled={busy} className="w-full"
                        onClick={() =>
                          void act(s.id, () => admin.publishSuggestionAsCommunityTime(s))
                        }>
                        Publish as community time
                      </Button>
                      <p className="mt-1.5 text-xs text-ink-muted">
                        Goes live labelled unverified, for visitors to confirm or dispute. Use
                        when it looks plausible but you haven&apos;t checked.
                      </p>
                    </div>

                    <Button size="sm" variant="ghost" disabled={busy} className="w-full"
                      onClick={() => void act(s.id, () => admin.rejectSuggestion(s.id))}>
                      Reject
                    </Button>
                  </div>
                  {masjid?.phone && (
                    <a href={`tel:${masjid.phone.replace(/[^+\d]/g, "")}`} className="text-xs text-ink-muted underline">
                      Call {masjid.name} to confirm: {masjid.phone}
                    </a>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
