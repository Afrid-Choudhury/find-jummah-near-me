import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ConfidenceMeta } from "@/components/masjid/ConfidenceMeta";
import { ConfidenceVote } from "@/components/masjid/ConfidenceVote";
import { DirectionsButton } from "@/components/masjid/DirectionsButton";
import { KhutbahTiming } from "@/components/masjid/KhutbahTiming";
import { SuggestTimeForm } from "@/components/masjid/SuggestTimeForm";
import { Badge, Card, Skeleton } from "@/components/ui";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useMasjid } from "@/hooks/useMasjids";

export function MasjidDetailPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { data: masjid, isLoading, error } = useMasjid(slug);
  const [suggestOpen, setSuggestOpen] = useState(false);

  useDocumentMeta(
    masjid ? `${masjid.name} — Jummah Times | Find Jummah Near Me` : "Find Jummah Near Me",
    masjid
      ? `Jummah times, address, and directions for ${masjid.name} in ${masjid.neighborhood ?? masjid.borough}.`
      : undefined,
  );

  if (isLoading) {
    return (
      <div className="space-y-4 px-4 pt-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-24 rounded-card" />
      </div>
    );
  }

  if (error || !masjid) {
    return (
      <div className="px-4 pt-8 text-center">
        <p className="font-display text-lg font-semibold text-night">Masjid not found</p>
        <p className="mt-1 text-sm text-ink-muted">
          It may have been removed or the link is incorrect.
        </p>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-saffron-deep underline">
          Back to all masjids
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 pt-4">
      <nav aria-label="Breadcrumb">
        <Link to="/" className="text-sm text-ink-muted hover:text-night">
          ← All masjids
        </Link>
      </nav>

      <header>
        <h1 className="font-display text-2xl font-semibold text-night">{masjid.name}</h1>
        <p className="mt-1 text-sm text-ink-muted">{masjid.address}</p>
        <div className="mt-2">
          <ConfidenceMeta masjid={masjid} />
        </div>
        <DirectionsButton masjid={masjid} className="mt-3 w-full" />
      </header>

      <KhutbahTiming masjid={masjid} onSuggestTime={() => setSuggestOpen(true)}>
        {masjid.jummahTimes.length > 0 ? (
          <SuggestTimeForm masjid={masjid} />
        ) : (
          <SuggestTimeForm masjid={masjid} open={suggestOpen} onOpenChange={setSuggestOpen} />
        )}
      </KhutbahTiming>

      <Card className="p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Contact & facilities
        </h2>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {masjid.phone && (
            <a
              href={`tel:${masjid.phone.replace(/[^+\d]/g, "")}`}
              className="rounded-full border border-line bg-paper-raised px-4 py-2 font-medium text-night"
            >
              Call {masjid.phone}
            </a>
          )}
          {masjid.website && (
            <a
              href={masjid.website}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-line bg-paper-raised px-4 py-2 font-medium text-night"
            >
              Website
            </a>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {masjid.hasWomensSection && <Badge>Women&apos;s section</Badge>}
          {masjid.capacity && <Badge>~{masjid.capacity} capacity</Badge>}
          <Badge>{masjid.neighborhood ? `${masjid.neighborhood} · ` : ""}{masjid.borough}</Badge>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Community confidence
        </h2>
        <div className="mt-3">
          <ConfidenceVote masjidId={masjid.id} />
        </div>
      </Card>
    </div>
  );
}
