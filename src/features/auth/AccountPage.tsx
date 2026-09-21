import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { Badge, Button, Card, Skeleton } from "@/components/ui";
import { useMasjids } from "@/hooks/useMasjids";
import { formatTime } from "@/lib/jummah";
import { signOut } from "@/services/authService";
import { listMySuggestions } from "@/services/suggestionService";
import { useAuth } from "./AuthProvider";

export function AccountPage() {
  const { user, isLoading } = useAuth();
  const { masjids } = useMasjids({ origin: null, search: "" });
  const suggestions = useQuery({
    queryKey: ["my-suggestions", user?.id],
    queryFn: () => listMySuggestions(user!.id),
    enabled: !!user,
  });

  if (isLoading) return <div className="px-4 pt-6"><Skeleton className="h-40 rounded-card" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  const nameOf = (id: string) => masjids.find((m) => m.id === id)?.name ?? "Masjid";
  const tone = { pending: "gold", approved: "green", rejected: "neutral" } as const;

  return (
    <div className="space-y-4 px-4 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-night">Your account</h1>
          <p className="text-sm text-ink-muted">{user.email}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void signOut()}>Sign out</Button>
      </div>

      <Card className="p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Your suggestions</h2>
        {suggestions.isLoading ? (
          <Skeleton className="mt-3 h-16" />
        ) : (suggestions.data ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            None yet. Open any masjid and tap “Suggest a time” to help keep schedules accurate.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {suggestions.data!.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <Link to={`/masjid/${masjids.find((m) => m.id === s.masjidId)?.slug ?? ""}`}
                    className="font-medium text-night underline-offset-4 hover:underline">
                    {nameOf(s.masjidId)}
                  </Link>
                  <p className="text-ink-muted">
                    Khutbah {s.khutbahNumber} · {formatTime(s.khutbahTime)} · {s.language}
                  </p>
                </div>
                <Badge tone={tone[s.status]}>{s.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
