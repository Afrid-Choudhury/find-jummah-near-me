import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/supabase";
import { submitSuggestion } from "@/services/suggestionService";
import type { Masjid } from "@/types";

interface SuggestTimeFormProps {
  masjid: Masjid;
}

/**
 * Community input, the safe way: signed-in users propose a khutbah time;
 * it lands in the admin queue and only goes public after approval.
 */
export function SuggestTimeForm({ masjid }: SuggestTimeFormProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [khutbahNumber, setKhutbahNumber] = useState(1);
  const [khutbahTime, setKhutbahTime] = useState("13:00");
  const [iqamahTime, setIqamahTime] = useState("");
  const [language, setLanguage] = useState("English");
  const [notes, setNotes] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!isSupabaseConfigured) return null;

  if (!user) {
    return (
      <p className="text-sm text-ink-muted">
        Know this masjid&apos;s Jummah time?{" "}
        <Link to="/login" state={{ from: location.pathname }} className="font-medium text-night underline">
          Sign in to suggest it
        </Link>
        .
      </p>
    );
  }

  if (state === "sent") {
    return (
      <p className="text-sm text-ink-muted">
        Thanks — your suggestion is in the review queue. It will appear here once verified.
      </p>
    );
  }

  if (!open) {
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
        { id: user.id, email: user.email ?? "unknown" },
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
