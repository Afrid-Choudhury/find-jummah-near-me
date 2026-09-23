import type { ReactNode } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { useNow } from "@/hooks/useNow";
import {
  buildKhutbahTimeline,
  formatClock,
  formatVerifiedDate,
  type KhutbahTimeline,
} from "@/lib/jummah";
import { isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { JummahTime, Masjid } from "@/types";
import { ConfidenceVote } from "./ConfidenceVote";

interface KhutbahTimingProps {
  masjid: Masjid;
  /** Fixed clock, for previews and tests. Defaults to a live ticking clock. */
  now?: Date;
  /** Footer slot — the detail page passes the suggest-a-time form. */
  children?: ReactNode;
  /** Opens the suggest-a-time form. Drives the empty state's "Add it" button. */
  onSuggestTime?: () => void;
}

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th"] as const;

function shiftLabel(time: JummahTime, total: number): string {
  if (total <= 1) return "Khutbah";
  const ordinal = ORDINALS[time.khutbahNumber - 1] ?? `#${time.khutbahNumber}`;
  return `${ordinal} khutbah`;
}

/**
 * The Friday schedule as a person actually lives it: khutbah begins, iqamah,
 * prayer ends — so someone running late can tell whether it is still worth
 * going. Only khutbah and iqamah are listed data; anything derived from them
 * is marked with ~ and called an estimate.
 */
export function KhutbahTiming({ masjid, now: fixedNow, children, onSuggestTime }: KhutbahTimingProps) {
  const tick = useNow();
  const now = fixedNow ?? tick;
  const times = masjid.jummahTimes;
  const hasTimes = times.length > 0;

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Khutbah timing
        </h2>
        {hasTimes && (
          <span className="text-xs text-ink-faint">
            Every Friday
            {times.length > 1 ? ` · ${times.length} khutbahs` : ""}
          </span>
        )}
      </div>

      {hasTimes ? (
        <>
          <ul className="mt-3 space-y-3">
            {times.map((time) => (
              <KhutbahShift
                key={time.id}
                time={time}
                label={shiftLabel(time, times.length)}
                timeline={buildKhutbahTimeline(time, now)}
                masjidId={masjid.id}
              />
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-faint">
            Times marked ~ are estimated from the khutbah and iqamah above, not
            listed by the masjid.
          </p>
        </>
      ) : (
        <EmptyKhutbahTiming masjid={masjid} {...(onSuggestTime ? { onSuggestTime } : {})} />
      )}

      {children && <div className="mt-4 border-t border-line pt-3">{children}</div>}
    </Card>
  );
}

interface KhutbahShiftProps {
  time: JummahTime;
  label: string;
  timeline: KhutbahTimeline;
  masjidId: string;
}

function KhutbahShift({ time, label, timeline, masjidId }: KhutbahShiftProps) {
  const { iqamahAt, khutbahMinutes, phase } = timeline;
  const isLive = phase === "khutbah" || phase === "prayer";
  const isCommunity = time.source === "community";

  return (
    <li
      className={cn(
        "rounded-lg border p-3",
        // Saffron stays reserved for times an admin confirmed. A community
        // time gets a dashed edge instead: legible and not apologetic, but
        // never mistakable for a verified one at a glance.
        isCommunity && "border-dashed bg-paper-sunken/40",
        isLive ? "border-saffron bg-saffron-soft/25" : "border-line",
        isCommunity && isLive && "border-dashed",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-night">{label}</span>
        <Badge tone={phase === "ended" || phase === "not-today" ? "neutral" : "gold"}>
          {timeline.statusLabel}
        </Badge>
      </div>

      <ol className="mt-3">
        <TimelineStep
          clock={formatClock(timeline.startsAt)}
          title="Khutbah begins"
          note={time.language ? `${time.language} khutbah` : null}
          tone={isCommunity ? "ink" : "gold"}
        />
        <TimelineStep
          clock={iqamahAt ? formatClock(iqamahAt) : "—"}
          title={iqamahAt ? "Iqamah · prayer begins" : "Iqamah not listed"}
          note={
            khutbahMinutes !== null
              ? `about ${khutbahMinutes} min of khutbah first`
              : "only the khutbah time is listed here"
          }
          tone={iqamahAt ? "ink" : "faint"}
        />
        <TimelineStep
          clock={`~${formatClock(timeline.endsAboutAt)}`}
          title="Usually finished by"
          note={timeline.isRoughEstimate ? "rough estimate — iqamah unlisted" : null}
          tone="faint"
          last
        />
      </ol>

      {time.notes && <p className="mt-1 text-xs text-ink-muted">{time.notes}</p>}

      <Provenance time={time} />

      {isCommunity && (
        <div className="mt-3 border-t border-line pt-3">
          <ConfidenceVote masjidId={masjidId} jummahTimeId={time.id} />
        </div>
      )}
    </li>
  );
}

/**
 * Says plainly where a time came from and how much weight to put on it. The
 * three states are the whole point of the tiered model: the wording has to
 * track the data, never flatter it.
 */
function Provenance({ time }: { time: JummahTime }) {
  if (time.source === "admin" && time.lastVerifiedAt) {
    return (
      <p className="mt-1 text-xs text-ink-faint">
        Verified {formatVerifiedDate(time.lastVerifiedAt)}
      </p>
    );
  }

  if (time.source === "admin") {
    return <p className="mt-1 text-xs text-ink-faint">Not yet verified</p>;
  }

  const confirmed = time.confirmations > 0 && time.confirmations >= time.reports;
  if (confirmed) {
    return (
      <p className="mt-1 text-xs text-ink-muted">
        Community time · confirmed by {time.confirmations}{" "}
        {time.confirmations === 1 ? "person" : "people"}
      </p>
    );
  }

  return (
    <div className="mt-1">
      <p className="text-xs text-ink-muted">Community time · not yet confirmed</p>
      <p className="mt-0.5 text-xs text-ink-faint">
        Sent in by someone in the community and not checked by us. If you&apos;ve prayed here,
        confirming it helps everyone else.
      </p>
    </div>
  );
}

interface TimelineStepProps {
  clock: string;
  title: string;
  note?: string | null;
  tone: "gold" | "ink" | "faint";
  last?: boolean;
}

function TimelineStep({ clock, title, note, tone, last = false }: TimelineStepProps) {
  const dotClass =
    tone === "gold" ? "bg-saffron" : tone === "faint" ? "bg-line" : "bg-night/40";
  const clockClass =
    tone === "gold" ? "text-saffron-deep" : tone === "faint" ? "text-ink-faint" : "text-night";

  return (
    <li className="grid grid-cols-[0.75rem_5.5rem_1fr] gap-x-2">
      <div className="flex flex-col items-center" aria-hidden="true">
        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dotClass)} />
        {!last && <span className="w-px flex-1 bg-line" />}
      </div>
      <span className={cn("whitespace-nowrap pb-3 text-sm font-semibold tabular-nums", clockClass)}>
        {clock}
      </span>
      <div className="pb-3">
        <p className={cn("text-sm leading-snug", tone === "faint" ? "text-ink-muted" : "text-ink")}>
          {title}
        </p>
        {note && <p className="mt-0.5 text-xs text-ink-faint">{note}</p>}
      </div>
    </li>
  );
}

interface EmptyKhutbahTimingProps {
  masjid: Masjid;
  onSuggestTime?: () => void;
}

function EmptyKhutbahTiming({ masjid, onSuggestTime }: EmptyKhutbahTimingProps) {
  const canSuggest = isSupabaseConfigured && onSuggestTime;

  return (
    <div className="mt-3 rounded-lg border border-dashed border-line bg-paper-sunken p-4">
      {canSuggest ? (
        <>
          <p className="text-sm font-medium text-night">Know this masjid&apos;s Jummah time?</p>
          <Button size="md" className="mt-2" onClick={onSuggestTime}>
            Add it
          </Button>
          <p className="mt-4 text-xs text-ink-faint">
            No verified schedule yet — call ahead to confirm before you travel.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-night">No khutbah time listed yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            We have this masjid&apos;s location but not its Friday schedule. Please call
            ahead to confirm before you travel.
          </p>
        </>
      )}
      {masjid.phone && (
        <a
          href={`tel:${masjid.phone.replace(/[^+\d]/g, "")}`}
          className="mt-2 inline-flex h-11 items-center rounded-full border border-line bg-paper-raised px-4 text-sm font-medium text-night"
        >
          Call {masjid.phone}
        </a>
      )}
    </div>
  );
}
