import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="px-4 pt-16 text-center">
      <p className="font-display text-5xl font-semibold text-night">404</p>
      <p className="mt-2 text-sm text-ink-muted">This page doesn&apos;t exist.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-full bg-night px-5 py-2.5 text-sm font-medium text-paper"
      >
        Find a masjid
      </Link>
    </div>
  );
}
