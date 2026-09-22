import { Link } from "react-router-dom";
import { SuggestMasjidForm } from "@/components/masjid/SuggestMasjidForm";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

export function SuggestMasjidPage() {
  useDocumentMeta(
    "Suggest a masjid | Find Jummah Near Me",
    "Tell us about a masjid that isn't listed yet and we'll add it after checking.",
  );

  return (
    <div className="space-y-4 px-4 pt-4">
      <nav aria-label="Breadcrumb">
        <Link to="/" className="text-sm text-ink-muted hover:text-night">
          ← All masjids
        </Link>
      </nav>

      <header>
        <h1 className="font-display text-2xl font-semibold text-night">Suggest a masjid</h1>
        <p className="mt-1 text-sm text-ink-muted">
          If a masjid is missing from the directory, send the name and address and it&apos;ll be
          added once someone has checked it.
        </p>
      </header>

      <SuggestMasjidForm />
    </div>
  );
}
