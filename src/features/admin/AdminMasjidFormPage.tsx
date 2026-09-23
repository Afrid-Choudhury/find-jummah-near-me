import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Skeleton } from "@/components/ui";
import { masjidKeys, useMasjids } from "@/hooks/useMasjids";
import { BOROUGHS } from "@/lib/constants";
import { formatTime, formatVerifiedDate } from "@/lib/jummah";
import { NYC_BOUNDS, parseMapLink, type MapLinkResult } from "@/lib/mapLinks";
import * as admin from "@/services/adminService";
import { fetchMasjidSuggestion } from "@/services/masjidSuggestionService";
import type { JummahTime, Masjid } from "@/types";

interface MasjidFormState {
  name: string;
  slug: string;
  address: string;
  borough: string;
  neighborhood: string;
  latitude: string;
  longitude: string;
  phone: string;
  website: string;
  capacity: string;
  hasWomensSection: boolean;
}

const EMPTY_FORM: MasjidFormState = {
  name: "",
  slug: "",
  address: "",
  borough: "Manhattan",
  neighborhood: "",
  latitude: "",
  longitude: "",
  phone: "",
  website: "",
  capacity: "",
  hasWomensSection: true,
};

function toFormState(masjid: Masjid): MasjidFormState {
  return {
    name: masjid.name,
    slug: masjid.slug,
    address: masjid.address,
    borough: masjid.borough,
    neighborhood: masjid.neighborhood ?? "",
    latitude: String(masjid.coordinates.latitude),
    longitude: String(masjid.coordinates.longitude),
    phone: masjid.phone ?? "",
    website: masjid.website ?? "",
    capacity: masjid.capacity ? String(masjid.capacity) : "",
    hasWomensSection: masjid.hasWomensSection,
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Create + edit in one page. Everything the vision requires an admin to do
 * without touching SQL: masjid fields, multiple Jummah times, verification
 * stamps, notes, amenities, and deletion.
 */
export function AdminMasjidFormPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Reuse the cached list rather than a separate fetch — admin edits small data.
  const { masjids, isLoading } = useMasjids({ origin: null, search: "" });
  const existing = masjids.find((m) => m.id === id);

  // Set when arriving from the review queue's "Approve" — the suggestion's
  // values prefill the form, and saving it closes the suggestion.
  const [searchParams] = useSearchParams();
  const fromSuggestionId = isNew ? searchParams.get("from_suggestion") : null;
  const suggestion = useQuery({
    queryKey: ["masjid-suggestion", fromSuggestionId],
    queryFn: () => fetchMasjidSuggestion(fromSuggestionId!),
    enabled: fromSuggestionId !== null,
  });

  const [form, setForm] = useState<MasjidFormState>(EMPTY_FORM);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mapLink, setMapLink] = useState("");
  const [mapLinkResult, setMapLinkResult] = useState<MapLinkResult | null>(null);

  const readMapLink = (value: string) => {
    setMapLink(value);
    if (!value.trim()) {
      setMapLinkResult(null);
      return;
    }
    const result = parseMapLink(value);
    setMapLinkResult(result);
    if (result.status === "ok") {
      setForm((prev) => ({
        ...prev,
        latitude: String(result.latitude),
        longitude: String(result.longitude),
      }));
    }
  };

  useEffect(() => {
    if (existing) setForm(toFormState(existing));
  }, [existing]);

  useEffect(() => {
    const proposed = suggestion.data;
    if (!proposed) return;
    // Coordinates come through only when the submitter pasted a link we could
    // read; otherwise they stay blank for the admin to fill in. Either way
    // they remain editable — a submitted pin still wants checking.
    setForm({
      ...EMPTY_FORM,
      name: proposed.name,
      slug: slugify(proposed.name),
      address: proposed.address,
      borough: proposed.borough ?? EMPTY_FORM.borough,
      neighborhood: proposed.neighborhood ?? "",
      phone: proposed.phone ?? "",
      website: proposed.website ?? "",
      latitude: proposed.coordinates ? String(proposed.coordinates.latitude) : "",
      longitude: proposed.coordinates ? String(proposed.coordinates.longitude) : "",
    });
  }, [suggestion.data]);

  const set = <K extends keyof MasjidFormState>(key: K, value: MasjidFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const refresh = () => queryClient.invalidateQueries({ queryKey: masjidKeys.all });

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("saving");
    setErrorMessage(null);

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setStatus("error");
      setErrorMessage("Latitude and longitude must be numbers.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      address: form.address.trim(),
      borough: form.borough,
      neighborhood: form.neighborhood.trim() || null,
      latitude,
      longitude,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      capacity: form.capacity ? Number(form.capacity) : null,
      has_womens_section: form.hasWomensSection,
    };

    try {
      if (isNew) {
        const newId = await admin.createMasjid(payload);
        if (fromSuggestionId) {
          // The masjid exists now, so a failure here must not read as a
          // failed save — surface it but keep going to the new masjid.
          try {
            await admin.approveMasjidSuggestion(fromSuggestionId);
            await queryClient.invalidateQueries({ queryKey: ["pending-masjid-suggestions"] });
          } catch (closeErr) {
            setErrorMessage(
              closeErr instanceof Error
                ? `Masjid created, but the suggestion is still open: ${closeErr.message}`
                : "Masjid created, but the suggestion is still open.",
            );
          }
        }
        await refresh();
        // A submitted time rides along as a draft for the times editor — it is
        // never written automatically. Public data stays admin-entered.
        const submittedTime = suggestion.data?.jummahTime;
        navigate(
          submittedTime
            ? `/admin/masjid/${newId}?prefill_time=${encodeURIComponent(submittedTime.slice(0, 5))}`
            : `/admin/masjid/${newId}`,
          { replace: true },
        );
      } else {
        await admin.updateMasjid(id, payload);
        await refresh();
      }
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Save failed.");
    }
  };

  const remove = async () => {
    if (!id || !existing) return;
    const confirmed = window.confirm(
      `Delete ${existing.name} and all its Jummah times? This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await admin.deleteMasjid(id);
      await refresh();
      navigate("/admin", { replace: true });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="space-y-4 px-4 pt-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    );
  }

  if (!isNew && !existing) {
    return (
      <div className="px-4 pt-8 text-center text-sm text-ink-muted">
        Masjid not found. <Link to="/admin" className="underline">Back to admin</Link>
      </div>
    );
  }

  const inputClass =
    "h-11 w-full rounded-lg border border-line bg-paper-raised px-3 text-sm";

  return (
    <div className="space-y-4 px-4 pt-4">
      <nav aria-label="Breadcrumb">
        <Link to="/admin" className="text-sm text-ink-muted hover:text-night">
          ← Admin
        </Link>
      </nav>
      <h1 className="font-display text-xl font-semibold text-night">
        {isNew ? (fromSuggestionId ? "Approve suggested masjid" : "Add masjid") : `Edit ${existing?.name}`}
      </h1>

      {suggestion.data && (
        <Card className="space-y-2 p-4">
          <p className="text-sm font-medium text-night">
            Prefilled from a community suggestion
          </p>
          <p className="text-xs text-ink-muted">
            {suggestion.data.coordinates
              ? "Coordinates came from the submitted link — check them against the map before saving."
              : "Add the coordinates below and check the slug. Saving marks the suggestion approved."}
          </p>
          {suggestion.data.mapLink && (
            <div className="rounded-lg bg-paper-sunken p-3">
              <p className="text-xs font-semibold uppercase text-ink-faint">Submitted map link</p>
              <SubmittedLink raw={suggestion.data.mapLink} />
            </div>
          )}
          {(suggestion.data.jummahTime || suggestion.data.notes) && (
            <div className="rounded-lg bg-paper-sunken p-3">
              <p className="text-xs font-semibold uppercase text-ink-faint">Also submitted</p>
              {suggestion.data.jummahTime && (
                <p className="mt-1 text-sm text-night">
                  Jummah {formatTime(suggestion.data.jummahTime)} — carried into the times
                  editor as a draft after you save; you still add it yourself.
                </p>
              )}
              {suggestion.data.notes && (
                <p className="mt-1 text-sm text-ink-muted">
                  &ldquo;{suggestion.data.notes}&rdquo;
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      <form onSubmit={(e) => void save(e)} className="space-y-3">
        <Card className="space-y-3 p-4">
          <Field label="Name" htmlFor="f-name">
            <input id="f-name" required className={inputClass} value={form.name}
              onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Slug (URL, auto-generated if blank)" htmlFor="f-slug">
            <input id="f-slug" className={inputClass} value={form.slug}
              placeholder={slugify(form.name) || "my-masjid"}
              onChange={(e) => set("slug", e.target.value)} />
          </Field>
          <Field label="Address" htmlFor="f-address">
            <input id="f-address" required className={inputClass} value={form.address}
              onChange={(e) => set("address", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Borough" htmlFor="f-borough">
              <select id="f-borough" className={inputClass} value={form.borough}
                onChange={(e) => set("borough", e.target.value)}>
                {BOROUGHS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </Field>
            <Field label="Neighborhood" htmlFor="f-neighborhood">
              <input id="f-neighborhood" className={inputClass} value={form.neighborhood}
                onChange={(e) => set("neighborhood", e.target.value)} />
            </Field>
          </div>
          <Field label="Paste a Google Maps link (fills in the coordinates)" htmlFor="f-maplink">
            <input
              id="f-maplink"
              className={inputClass}
              placeholder="https://www.google.com/maps/place/… or 40.750001, -73.904596"
              value={mapLink}
              onChange={(e) => readMapLink(e.target.value)}
            />
            <MapLinkMessage result={mapLinkResult} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude" htmlFor="f-lat">
              <input id="f-lat" required inputMode="decimal" className={inputClass}
                value={form.latitude} onChange={(e) => set("latitude", e.target.value)} />
            </Field>
            <Field label="Longitude" htmlFor="f-lng">
              <input id="f-lng" required inputMode="decimal" className={inputClass}
                value={form.longitude} onChange={(e) => set("longitude", e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" htmlFor="f-phone">
              <input id="f-phone" className={inputClass} value={form.phone}
                onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Capacity" htmlFor="f-capacity">
              <input id="f-capacity" inputMode="numeric" className={inputClass}
                value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
            </Field>
          </div>
          <Field label="Website" htmlFor="f-website">
            <input id="f-website" type="url" className={inputClass} value={form.website}
              placeholder="https://" onChange={(e) => set("website", e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-night">
            <input
              type="checkbox"
              checked={form.hasWomensSection}
              onChange={(e) => set("hasWomensSection", e.target.checked)}
              className="h-5 w-5 rounded border-line accent-night"
            />
            Women&apos;s section available
          </label>
        </Card>

        {errorMessage && <p className="text-sm text-red-700">{errorMessage}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={status === "saving"} className="flex-1">
            {status === "saving" ? "Saving…" : isNew ? "Create masjid" : "Save changes"}
          </Button>
          {!isNew && (
            <Button type="button" variant="secondary" onClick={() => void remove()}>
              Delete
            </Button>
          )}
        </div>
      </form>

      {!isNew && existing && (
        <>
          <ReviewCard masjid={existing} onChanged={() => void refresh()} />
          <JummahTimesEditor
            masjid={existing}
            onChanged={() => void refresh()}
            prefillTime={searchParams.get("prefill_time")}
          />
          <EditorsCard masjid={existing} />
        </>
      )}
    </div>
  );
}

/**
 * A submitted link is untrusted text, so only http(s) becomes an href — a
 * `javascript:` URL pasted into the public form must not be clickable here.
 */
function SubmittedLink({ raw }: { raw: string }) {
  let href: string | null = null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol === "http:" || url.protocol === "https:") href = url.href;
  } catch {
    href = null;
  }

  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="mt-1 block break-all text-sm font-medium text-night underline"
    >
      {raw}
    </a>
  ) : (
    <p className="mt-1 break-all text-sm text-ink-muted">{raw}</p>
  );
}

/** Inline feedback for the pasted-link field — never blocks the manual inputs. */
function MapLinkMessage({ result }: { result: MapLinkResult | null }) {
  if (!result) return null;

  if (result.status === "ok") {
    return (
      <p
        className={`mt-1 text-xs ${
          result.source === "center" ? "text-saffron-deep" : "text-ink-muted"
        }`}
      >
        {result.source === "center"
          ? "Filled in from the map's centre, which isn't always the pin — check it against the marker."
          : "Coordinates filled in below."}
      </p>
    );
  }

  if (result.status === "short-link") {
    return (
      <p className="mt-1 text-xs text-red-700">
        A short link can&apos;t be opened from here. Open it in Maps, then copy the full URL from
        the address bar and paste that instead.
      </p>
    );
  }

  if (result.status === "out-of-bounds") {
    return (
      <p className="mt-1 text-xs text-red-700">
        {result.latitude}, {result.longitude} is outside the area this directory covers
        (latitude {NYC_BOUNDS.minLatitude}–{NYC_BOUNDS.maxLatitude}, longitude{" "}
        {NYC_BOUNDS.minLongitude}–{NYC_BOUNDS.maxLongitude}). Nothing was filled in.
      </p>
    );
  }

  return (
    <p className="mt-1 text-xs text-red-700">
      No coordinates in that. Paste a full Maps URL, or type the pair directly as
      &ldquo;40.750001, -73.904596&rdquo;.
    </p>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-night">
        {label}
      </label>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Jummah times editor — add, edit inline, verify, delete schedules
 * ------------------------------------------------------------------------- */

interface TimeDraft {
  khutbahTime: string;
  iqamahTime: string;
  language: string;
  notes: string;
}

/** Postgres "13:15:00" -> "13:15" for <input type="time"> */
const toInputTime = (t: string | null) => (t ? t.slice(0, 5) : "");

function JummahTimesEditor({
  masjid,
  onChanged,
  prefillTime = null,
}: {
  masjid: Masjid;
  onChanged: () => void;
  /** A community-submitted time, seeded as a draft — never saved for you. */
  prefillTime?: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<TimeDraft>({ khutbahTime: "", iqamahTime: "", language: "", notes: "" });
  const [draft, setDraft] = useState<TimeDraft>({
    khutbahTime: prefillTime || "13:00",
    iqamahTime: "",
    language: "English",
    notes: "",
  });

  const run = async (action: () => Promise<void>) => {
    setError(null);
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    }
  };

  const startEdit = (t: JummahTime) => {
    setEditingId(t.id);
    setEdit({
      khutbahTime: toInputTime(t.khutbahTime),
      iqamahTime: toInputTime(t.iqamahTime),
      language: t.language,
      notes: t.notes ?? "",
    });
  };

  const saveEdit = (id: string) =>
    run(async () => {
      await admin.updateJummahTime(id, {
        khutbah_time: edit.khutbahTime,
        iqamah_time: edit.iqamahTime || null,
        language: edit.language.trim() || "English",
        notes: edit.notes.trim() || null,
        // Editing implies you just confirmed it, so it's verified — and a
        // community time edited here is promoted, same as markTimeVerified.
        last_verified_at: new Date().toISOString(),
        source: "admin",
      });
      setEditingId(null);
    });

  // Retracted rows still occupy their khutbah number — unique(masjid_id,
  // khutbah_number) means ignoring them would collide on insert.
  const nextNumber =
    [...masjid.jummahTimes, ...masjid.retractedTimes].reduce(
      (max, t) => Math.max(max, t.khutbahNumber),
      0,
    ) + 1;
  return (
    <Card className="space-y-4 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Jummah times</h2>

      <ul className="space-y-3">
        {masjid.jummahTimes.map((time) => (
          <li key={time.id} className="rounded-lg border border-line p-3">
            {editingId === time.id ? (
              <div>
                <p className="mb-2 text-sm font-semibold text-night">Editing khutbah {time.khutbahNumber}</p>
                <DraftFields value={edit} onChange={setEdit} />
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={() => void saveEdit(time.id)}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold tabular-nums text-night">
                    Khutbah {time.khutbahNumber} · {formatTime(time.khutbahTime)}
                    {time.iqamahTime && (
                      <span className="ml-2 font-normal text-ink-muted">iqamah {formatTime(time.iqamahTime)}</span>
                    )}
                    <span className="ml-2 font-normal text-ink-muted">{time.language}</span>
                  </p>
                  <div className="flex shrink-0 gap-3 text-xs">
                    <button type="button" onClick={() => startEdit(time)} className="text-night underline">Edit</button>
                    <button type="button" onClick={() => void run(() => admin.deleteJummahTime(time.id))}
                      className="text-red-700 underline">Remove</button>
                  </div>
                </div>
                {time.notes && <p className="mt-1 text-xs text-ink-muted">{time.notes}</p>}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-ink-faint">
                    {time.lastVerifiedAt ? `Verified ${formatVerifiedDate(time.lastVerifiedAt)}` : "Not yet verified"}
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => void run(() => admin.markTimeVerified(time.id))}>
                    Mark verified today
                  </Button>
                </div>
              </>
            )}
          </li>
        ))}
        {masjid.jummahTimes.length === 0 && masjid.retractedTimes.length === 0 && (
          <li className="text-sm text-ink-muted">No times yet — add the first below.</li>
        )}
      </ul>

      {masjid.retractedTimes.length > 0 && (
        <div className="rounded-lg border border-red-700/40 bg-paper-sunken p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Hidden — taken down by the community
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Not shown on the site and not used for recommendations. Fix the time and mark it
            verified to bring it back, or remove it.
          </p>
          <ul className="mt-2 space-y-2">
            {masjid.retractedTimes.map((time) => (
              <li key={time.id} className="rounded-lg border border-line bg-paper-raised p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold tabular-nums text-night">
                    Khutbah {time.khutbahNumber} · {formatTime(time.khutbahTime)}
                  </p>
                  <div className="flex shrink-0 gap-3 text-xs">
                    <button type="button" onClick={() => startEdit(time)} className="text-night underline">
                      Edit
                    </button>
                    <button type="button" onClick={() => void run(() => admin.deleteJummahTime(time.id))}
                      className="text-red-700 underline">
                      Remove
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  👎 {time.reports} · 👍 {time.confirmations}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg bg-paper-sunken p-3">
        <p className="text-sm font-medium text-night">Add khutbah {nextNumber}</p>
        {prefillTime && masjid.jummahTimes.length === 0 && (
          <p className="mt-1 text-xs text-saffron-deep">
            Prefilled with the submitted time — check it, then add it. Nothing was saved
            automatically.
          </p>
        )}
        <div className="mt-2">
          <DraftFields value={draft} onChange={setDraft} />
        </div>
        <Button size="sm" className="mt-2"
          onClick={() =>
            void run(() =>
              admin.addJummahTime({
                masjid_id: masjid.id,
                khutbah_number: nextNumber,
                khutbah_time: draft.khutbahTime,
                iqamah_time: draft.iqamahTime || null,
                language: draft.language || "English",
                notes: draft.notes || null,
                last_verified_at: new Date().toISOString(),
              }),
            )
          }>
          Add time
        </Button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
    </Card>
  );
}

/* ---------------------------------------------------------------------------
 * Community confidence review — "Mark reviewed" resets the counters
 * ------------------------------------------------------------------------- */

function ReviewCard({ masjid, onChanged }: { masjid: Masjid; onChanged: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const review = async () => {
    setError(null);
    try {
      await admin.markMasjidReviewed(masjid.id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark reviewed.");
    }
  };

  return (
    <Card className="p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Community confidence</h2>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="text-sm">
          <p className="tabular-nums text-night">
            👍 {masjid.confirmations} &nbsp; 👎 {masjid.reports}
            <span className="ml-2 text-xs text-ink-faint">since last review</span>
          </p>
          <p className="text-xs text-ink-muted">
            {masjid.lastReviewedAt
              ? `Last reviewed ${formatVerifiedDate(masjid.lastReviewedAt)}`
              : "Never reviewed — counters include all signals ever received"}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => void review()}>
          Mark reviewed
        </Button>
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        After you've checked the reports and fixed anything wrong, mark reviewed to reset the public
        counters. Old signals are kept in the database for history.
      </p>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </Card>
  );
}

/* ---------------------------------------------------------------------------
 * Masjid editors — who may maintain this masjid's times without the queue
 * ------------------------------------------------------------------------- */

function EditorsCard({ masjid }: { masjid: Masjid }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editors = useQuery({
    queryKey: ["masjid-editors", masjid.id],
    queryFn: () => admin.listMasjidEditors(masjid.id),
  });

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await editors.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const grant = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    await run(async () => {
      await admin.grantMasjidEditor(masjid.id, email.trim());
      setEmail("");
    });
  };

  const inputClass = "h-11 w-full rounded-lg border border-line bg-paper-raised px-3 text-sm";

  return (
    <Card className="space-y-3 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Editors</h2>
      <p className="text-xs text-ink-muted">
        An editor can add, change and remove this masjid&apos;s Jummah times directly, without
        going through the suggestion queue. They can&apos;t edit any other masjid, and can&apos;t
        grant access to anyone else.
      </p>

      {editors.isLoading ? (
        <Skeleton className="h-12 rounded-lg" />
      ) : editors.error ? (
        <p className="text-sm text-red-700">
          {editors.error instanceof Error ? editors.error.message : "Could not load editors."}
        </p>
      ) : (editors.data ?? []).length === 0 ? (
        <p className="text-sm text-ink-muted">No editors yet.</p>
      ) : (
        <ul className="space-y-2">
          {editors.data!.map((editor) => (
            <li
              key={editor.userId}
              className="flex items-center justify-between gap-2 rounded-lg border border-line p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-night">{editor.email}</p>
                <p className="text-xs text-ink-faint">
                  Added {formatVerifiedDate(editor.createdAt)}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(() => admin.revokeMasjidEditor(masjid.id, editor.userId))}
                className="shrink-0 text-xs text-red-700 underline disabled:opacity-50"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(e) => void grant(e)} className="rounded-lg bg-paper-sunken p-3">
        <label htmlFor="editor-email" className="mb-1 block text-sm font-medium text-night">
          Grant editor access
        </label>
        <input
          id="editor-email"
          type="email"
          className={inputClass}
          placeholder="Their account email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="mt-1 text-xs text-ink-faint">
          They need to have signed up already — access is matched to an existing account.
        </p>
        <Button type="submit" size="sm" className="mt-2" disabled={busy || !email.trim()}>
          {busy ? "Working…" : "Grant access"}
        </Button>
      </form>

      {error && <p className="text-sm text-red-700">{error}</p>}
    </Card>
  );
}

/** Shared fields for adding or editing a schedule. Module-level so inputs keep focus across renders. */
function DraftFields({ value, onChange }: { value: TimeDraft; onChange: (v: TimeDraft) => void }) {
  const inputClass = "h-11 w-full rounded-lg border border-line bg-paper-raised px-3 text-sm";
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-ink-muted">Khutbah
          <input type="time" required className={inputClass} value={value.khutbahTime}
            onChange={(e) => onChange({ ...value, khutbahTime: e.target.value })} />
        </label>
        <label className="text-xs text-ink-muted">Iqamah (optional)
          <input type="time" className={inputClass} value={value.iqamahTime}
            onChange={(e) => onChange({ ...value, iqamahTime: e.target.value })} />
        </label>
      </div>
      <input aria-label="Language" placeholder="Language" className={`${inputClass} mt-2`} value={value.language}
        onChange={(e) => onChange({ ...value, language: e.target.value })} />
      <input aria-label="Notes" placeholder="Notes (optional)" className={`${inputClass} mt-2`} value={value.notes}
        onChange={(e) => onChange({ ...value, notes: e.target.value })} />
    </>
  );
}
