import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button, Card, Skeleton } from "@/components/ui";
import { masjidKeys, useMasjids } from "@/hooks/useMasjids";
import { formatTime } from "@/lib/jummah";
import * as admin from "@/services/adminService";
import { listPendingSuggestions } from "@/services/suggestionService";
import type { TimeSuggestion } from "@/types";

/**
 * Review queue. Each card shows the suggestion beside the masjid's current
 * schedule so you can see at a glance whether it's new info, a correction,
 * or a duplicate. Approve = write to jummah_times + stamp verified.
 */
export function AdminSuggestionsPage() {
  const queryClient = useQueryClient();
  const { masjids } = useMasjids({ origin: null, search: "" });
  const pending = useQuery({ queryKey: ["pending-suggestions"], queryFn: listPendingSuggestions });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (id: string, action: () => Promise<void>) => {
    setBusyId(id);
    setError(null);
    try {
      await action();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pending-suggestions"] }),
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
                      from {s.submittedBy} · {new Date(s.createdAt).toLocaleDateString()}
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

                  <div className="flex gap-2">
                    <Button size="sm" disabled={busy} className="flex-1"
                      onClick={() => void act(s.id, () => admin.approveSuggestion(s))}>
                      {current ? "Approve & replace" : "Approve & publish"}
                    </Button>
                    <Button size="sm" variant="secondary" disabled={busy}
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
