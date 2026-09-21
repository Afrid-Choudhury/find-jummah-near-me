import type { MasjidWithDistance } from "@/types";

interface MapPlaceholderProps {
  masjids: MasjidWithDistance[];
}

/**
 * Placeholder for the interactive map (Phase 4: react-leaflet or Mapbox GL).
 * Renders a stylized grid with a pin count so the layout, spacing, and API
 * surface (a list of masjids in) match the real map that will replace it —
 * swap this component's internals without touching HomePage.
 */
export function MapPlaceholder({ masjids }: MapPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={`Map of ${masjids.length} masjids in New York City (interactive map coming soon)`}
      className="relative h-44 overflow-hidden rounded-card border border-line bg-night sm:h-52"
    >
      {/* Street grid motif */}
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full opacity-25">
        <defs>
          <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#f4efe4" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <path d="M -10 120 Q 120 60 260 130 T 520 100" fill="none" stroke="#d9a441" strokeWidth="1.5" opacity="0.7" />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron text-night shadow-raised">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 18s6-5.1 6-9.6A6 6 0 0 0 4 8.4C4 12.9 10 18 10 18Zm0-7.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <p className="text-sm font-medium text-paper">
          {masjids.length} {masjids.length === 1 ? "masjid" : "masjids"} across NYC
        </p>
        <p className="text-xs text-paper/60">Interactive map coming soon</p>
      </div>
    </div>
  );
}
