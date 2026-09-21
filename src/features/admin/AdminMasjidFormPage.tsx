import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Skeleton } from "@/components/ui";
import { masjidKeys, useMasjids } from "@/hooks/useMasjids";
import { BOROUGHS } from "@/lib/constants";
import { formatTime, formatVerifiedDate } from "@/lib/jummah";
import * as admin from "@/services/adminService";
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

  const [form, setForm] = useState<MasjidFormState>(EMPTY_FORM);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (existing) setForm(toFormState(existing));
  }, [existing]);

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
        await refresh();
        navigate(`/admin/masjid/${newId}`, { replace: true });
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
        {isNew ? "Add masjid" : `Edit ${existing?.name}`}
      </h1>

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
          <JummahTimesEditor masjid={existing} onChanged={() => void refresh()} />
          <EditorsCard masjid={existing} />
        </>
      )}
    </div>
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
}: {
  masjid: Masjid;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<TimeDraft>({ khutbahTime: "", iqamahTime: "", language: "", notes: "" });
  const [draft, setDraft] = useState<TimeDraft>({ khutbahTime: "13:00", iqamahTime: "", language: "English", notes: "" });

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
        last_verified_at: new Date().toISOString(), // editing implies you just confirmed it
      });
      setEditingId(null);
    });

  const nextNumber = masjid.jummahTimes.reduce((max, t) => Math.max(max, t.khutbahNumber), 0) + 1;
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
        {masjid.jummahTimes.length === 0 && (
          <li className="text-sm text-ink-muted">No times yet — add the first below.</li>
        )}
      </ul>

      <div className="rounded-lg bg-paper-sunken p-3">
        <p className="text-sm font-medium text-night">Add khutbah {nextNumber}</p>
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
