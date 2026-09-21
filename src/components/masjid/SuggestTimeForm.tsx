import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/supabase";
import { submitSuggestion } from "@/services/suggestionService";
import type { Masjid } from "@/types";

interface SuggestTimeFormProps {
  masjid: Masjid;
  /**
   * Controlled open state. Pass both `open` and `onOpenChange` when an
   * outside trigger (e.g. EmptyKhutbahTiming's "Add it" button) owns the
   * toggle — the form then renders nothing while closed, instead of its
   * own trigger button. Omit both for the self-contained default: an
   * internal "Suggest a Jummah time" button that opens the form itself.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Community input, the safe way: anyone can propose a khutbah time, signed
 * in or not; it lands in the admin queue and only goes public after
 * approval.
 */
export function SuggestTimeForm({ masjid, open: controlledOpen, onOpenChange }: SuggestTimeFormProps) {
  const { user } = useAuth();
  const isControlled = onOpenChange !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? (controlledOpen ?? false) : internalOpen;
  const setOpen = isControlled ? (onOpenChange as (open: boolean) => void) : setInternalOpen;
  const [khutbahNumber, setKhutbahNumber] = useState(1);
  const [khutbahTime, setKhutbahTime] = useState("13:00");
  const [iqamahTime, setIqamahTime] = useState("");
  const [language, setLanguage] = useState("English");
  const [notes, setNotes] = useState("");
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!isSupabaseConfigured) return null;

  if (state === "sent") {
    return (
      <p className="text-sm text-ink-muted">
        Thanks — your suggestion is in the review queue. It will appear here once verified.
      </p>
    );
  }

  if (!open) {
    // Controlled: the caller owns the trigger (e.g. EmptyKhutbahTiming's
    // "Add it" button) and renders it already, so don't show a second one.
    if (isControlled) return null;
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Suggest a Jummah time
      </Button>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("sending");
    setError(null);
    try {
      await submitSuggestion(
        {
          masjidId: masjid.id,
          khutbahNumber,
          khutbahTime,
          iqamahTime: iqamahTime || null,
          language: language.trim() || "English",
          notes: notes.trim() || null,
        },
        user ? { id: user.id, email: user.email ?? "unknown" } : null,
        contact.trim() || null,
      );
      setState("sent");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Could not submit.");
    }
  };

  const inputClass = "h-11 w-full rounded-lg border border-line bg-paper-raised px-3 text-sm";

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3">
      <p className="text-sm text-ink-muted">
        Suggestions are reviewed by an admin before going live.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-night">Khutbah #</span>
          <select className={inputClass} value={khutbahNumber}
            onChange={(e) => setKhutbahNumber(Number(e.target.value))}>
            {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-night">Khutbah time</span>
          <input type="time" required className={inputClass} value={khutbahTime}
            onChange={(e) => setKhutbahTime(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-night">Iqamah (optional)</span>
          <input type="time" className={inputClass} value={iqamahTime}
            onChange={(e) => setIqamahTime(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-night">Language</span>
          <input className={inputClass} value={language} onChange={(e) => setLanguage(e.target.value)} />
        </label>
      </div>
      <input className={inputClass} placeholder="Notes (optional) — e.g. summer schedule, arrive early"
        value={notes} onChange={(e) => setNotes(e.target.value)} />
      {!user && (
        <label className="text-sm">
          <span className="mb-1 block font-medium text-night">Name or email (optional)</span>
          <input className={inputClass} placeholder="So we can follow up if we have questions"
            value={contact} onChange={(e) => setContact(e.target.value)} />
        </label>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Submit suggestion"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
