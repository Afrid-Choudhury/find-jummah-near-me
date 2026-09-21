import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button, Card } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase";
import { sendPasswordReset, signIn, signUp } from "@/services/authService";
import { useAuth } from "./AuthProvider";

type Mode = "signin" | "signup";

/**
 * One page for sign in + registration (email/password). After success it
 * returns the user to wherever they came from (e.g., a masjid page where
 * they wanted to suggest a time).
 */
export function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/account";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  if (user) return <Navigate to={from} replace />;

  if (!isSupabaseConfigured) {
    return (
      <div className="px-4 pt-6">
        <Card className="p-5">
          <h1 className="font-display text-lg font-semibold text-night">Accounts not available</h1>
          <p className="mt-2 text-sm text-ink-muted">
            This is a preview running on sample data. Accounts work once Supabase is connected.
          </p>
        </Card>
      </div>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) {
          setMessage({
            kind: "info",
            text: `Check ${email} for a confirmation link, then sign in.`,
          });
          setMode("signin");
        } else {
          navigate(from, { replace: true });
        }
      } else {
        await signIn(email, password);
        navigate(from, { replace: true });
      }
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!email) {
      setMessage({ kind: "error", text: "Enter your email first, then tap reset." });
      return;
    }
    try {
      await sendPasswordReset(email);
      setMessage({ kind: "info", text: `Password reset link sent to ${email}.` });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Could not send reset." });
    }
  };

  const inputClass = "h-11 w-full rounded-lg border border-line bg-paper-raised px-3 text-sm";

  return (
    <div className="px-4 pt-6">
      <Card className="p-5">
        <div className="flex rounded-full bg-paper-sunken p-1 text-sm font-medium">
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setMessage(null); }}
              className={`flex-1 rounded-full py-2 transition-colors ${
                mode === m ? "bg-night text-paper" : "text-ink-muted"
              }`}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <p className="mt-4 text-sm text-ink-muted">
          {mode === "signup"
            ? "An account lets you suggest Jummah times. Suggestions are reviewed before they go live."
            : "Welcome back."}
        </p>

        <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3">
          <div>
            <label htmlFor="auth-email" className="mb-1 block text-sm font-medium text-night">Email</label>
            <input id="auth-email" type="email" required autoComplete="email" className={inputClass}
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="auth-password" className="mb-1 block text-sm font-medium text-night">Password</label>
            <input id="auth-password" type="password" required minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
            {mode === "signup" && <p className="mt-1 text-xs text-ink-faint">At least 8 characters.</p>}
          </div>

          {message && (
            <p className={`text-sm ${message.kind === "error" ? "text-red-700" : "text-night"}`}>
              {message.text}
            </p>
          )}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </form>

        {mode === "signin" && (
          <button type="button" onClick={() => void reset()} className="mt-3 text-xs text-ink-muted underline">
            Forgot password?
          </button>
        )}
      </Card>
      <p className="mt-4 text-center text-xs text-ink-faint">
        <Link to="/" className="underline">Back to masjids</Link>
      </p>
    </div>
  );
}
