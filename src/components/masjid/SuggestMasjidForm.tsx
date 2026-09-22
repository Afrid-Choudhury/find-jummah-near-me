import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDebounce } from "@/hooks/useDebounce";
import { useMasjids } from "@/hooks/useMasjids";
import { BOROUGHS } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase";
import { submitMasjidSuggestion } from "@/services/masjidSuggestionService";

/** Below this, a name fragment matches too much to be a useful warning. */
const MIN_MATCH_LENGTH = 3;
const MAX_MATCHES_SHOWN = 4;

/**
 * Propose a masjid that isn't listed. Most "missing" masjids turn out to be
 * listed under a different spelling, so matches on the name are surfaced as
 * the person types — before they spend effort on the rest of the form.
 */
export function SuggestMasjidForm() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [borough, setBorough] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [jummahTime, setJummahTime] = useState("");
  const [notes, setNotes] = useState("");
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const debouncedName = useDebounce(name);
  const searchTerm = debouncedName.trim().length >= MIN_MATCH_LENGTH ? debouncedName.trim() : "";
  const { masjids } = useMasjids({ origin: null, search: searchTerm });
  const matches = searchTerm ? masjids.slice(0, MAX_MATCHES_SHOWN) : [];

  if (!isSupabaseConfigured) {
    return (
      <p className="text-sm text-ink-muted">
        Suggestions need a connected backend, which isn&apos;t configured here.
      </p>
    );
  }

  if (state === "sent") {
    return (
      <Card className="p-4">
        <p className="text-sm font-medium text-night">Thanks — that&apos;s in the queue.</p>
        <p className="mt-1 text-sm text-ink-muted">
          An admin checks each suggestion before it goes on the map, so it won&apos;t appear
          straight away.
        </p>
        <Link to="/" className="mt-3 inline-block text-sm font-medium text-night underline">
          Back to all masjids
        </Link>
      </Card>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("sending");
    setError(null);
    try {
      await submitMasjidSuggestion(
        {
          name: name.trim(),
          address: address.trim(),
          borough: borough || null,
          neighborhood: neighborhood.trim() || null,
          phone: phone.trim() || null,
          website: website.trim() || null,
          jummahTime: jummahTime || null,
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
  const labelClass = "mb-1 block text-sm font-medium text-night";

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3">
      <Card className="space-y-3 p-4">
        <div>
          <label htmlFor="sm-name" className={labelClass}>
            Masjid name
          </label>
          <input
            id="sm-name"
            required
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {matches.length > 0 && (
          <div className="rounded-lg border border-saffron bg-saffron-soft/25 p-3">
            <p className="text-sm font-medium text-night">
              {matches.length === 1 ? "This one is already listed" : "Already listed — is it one of these?"}
            </p>
            <ul className="mt-2 space-y-1">
              {matches.map((masjid) => (
                <li key={masjid.id}>
                  <Link
                    to={`/masjid/${masjid.slug}`}
                    className="text-sm font-medium text-night underline"
                  >
                    {masjid.name}
                  </Link>
                  <span className="block text-xs text-ink-muted">{masjid.address}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-muted">
              If yours is there, open it and add the Jummah time instead — that reaches the same
              review queue and is quicker for everyone.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="sm-address" className={labelClass}>
            Address
          </label>
          <input
            id="sm-address"
            required
            className={inputClass}
            placeholder="Street, city, ZIP"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="sm-borough" className={labelClass}>
              Borough
            </label>
            <select
              id="sm-borough"
              className={inputClass}
              value={borough}
              onChange={(e) => setBorough(e.target.value)}
            >
              <option value="">Not sure</option>
              {BOROUGHS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sm-neighborhood" className={labelClass}>
              Neighborhood
            </label>
            <input
              id="sm-neighborhood"
              className={inputClass}
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="sm-jummah" className={labelClass}>
              Jummah time
            </label>
            <input
              id="sm-jummah"
              type="time"
              className={inputClass}
              value={jummahTime}
              onChange={(e) => setJummahTime(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="sm-phone" className={labelClass}>
              Phone
            </label>
            <input
              id="sm-phone"
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="sm-website" className={labelClass}>
            Website
          </label>
          <input
            id="sm-website"
            type="url"
            className={inputClass}
            placeholder="https://"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="sm-notes" className={labelClass}>
            Anything else
          </label>
          <input
            id="sm-notes"
            className={inputClass}
            placeholder="Entrance, floor, women's section…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {!user && (
          <div>
            <label htmlFor="sm-contact" className={labelClass}>
              Name or email (optional)
            </label>
            <input
              id="sm-contact"
              className={inputClass}
              placeholder="So we can follow up if we have questions"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>
        )}

        <p className="text-xs text-ink-faint">
          Only the name and address are required. An admin checks the location and adds it to the
          map, so it won&apos;t appear straight away.
        </p>
      </Card>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <Button type="submit" className="w-full" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Submit masjid"}
      </Button>
    </form>
  );
}
