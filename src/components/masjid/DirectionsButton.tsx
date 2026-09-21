import { directionsUrl } from "@/lib/directions";
import { cn } from "@/lib/utils";
import type { Masjid } from "@/types";

interface DirectionsButtonProps {
  masjid: Pick<Masjid, "coordinates" | "name">;
  variant?: "solid" | "outline";
  className?: string;
}

/**
 * The most common action in the app: opens Apple Maps on iPhone, Google Maps
 * elsewhere, destination pre-filled. Rendered as a large touch target
 * (min 44px) on every card and recommendation.
 */
export function DirectionsButton({
  masjid,
  variant = "solid",
  className,
}: DirectionsButtonProps) {
  return (
    <a
      href={directionsUrl(masjid)}
      target="_blank"
      rel="noreferrer"
      aria-label={`Get directions to ${masjid.name}`}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors",
        variant === "solid"
          ? "bg-saffron text-night hover:bg-saffron-deep hover:text-paper"
          : "border border-line bg-paper-raised text-night hover:border-night/30",
        className,
      )}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M10.75 2.45a1.06 1.06 0 0 0-1.5 0l-6.8 6.8a1.06 1.06 0 0 0 0 1.5l6.8 6.8a1.06 1.06 0 0 0 1.5 0l6.8-6.8a1.06 1.06 0 0 0 0-1.5l-6.8-6.8ZM9 12.5V11H7v-1.5A1.5 1.5 0 0 1 8.5 8H11V6.5l2.5 2.25L11 11V9.5H9v3Z" />
      </svg>
      Directions
    </a>
  );
}
