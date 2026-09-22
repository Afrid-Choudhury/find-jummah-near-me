import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui";
import type { MasjidWithDistance } from "@/types";
import { MasjidCard } from "./MasjidCard";

interface MasjidListProps {
  masjids: MasjidWithDistance[];
  now: Date;
  isLoading: boolean;
  error: Error | null;
  searchTerm: string;
}

export function MasjidList({ masjids, now, isLoading, error, searchTerm }: MasjidListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading masjids">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-card" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-card border border-line bg-paper-raised p-6 text-center">
        <p className="text-sm font-medium text-night">Couldn&apos;t load masjids</p>
        <p className="mt-1 text-sm text-ink-muted">
          Check your connection and refresh the page. ({error.message})
        </p>
      </div>
    );
  }

  if (masjids.length === 0) {
    return (
      <div className="rounded-card border border-line bg-paper-raised p-6 text-center">
        <p className="text-sm font-medium text-night">No masjids match your search</p>
        <p className="mt-1 text-sm text-ink-muted">
          {searchTerm
            ? `Try a different spelling or clear "${searchTerm}".`
            : "New masjids are added regularly."}
        </p>
        <Link
          to="/suggest-masjid"
          className="mt-4 inline-flex h-11 items-center rounded-full bg-night px-4 text-sm font-medium text-paper"
        >
          Suggest a missing masjid
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {masjids.map((masjid) => (
          <li key={masjid.id}>
            <MasjidCard masjid={masjid} now={now} />
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-xs text-ink-muted">
        Masjid not here?{" "}
        <Link to="/suggest-masjid" className="font-medium text-night underline">
          Suggest a missing masjid
        </Link>
      </p>
    </>
  );
}
