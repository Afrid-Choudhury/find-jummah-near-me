import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/supabase";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

/**
 * One 3.5rem row at every width — the homepage's sticky search and map pane
 * offset against that height. The nav shows from `md`; on phones it lives in
 * the footer instead, since a second sticky strip cost every scroll 2rem of
 * screen and the name already links home.
 */
export function Header() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-6 px-4">
        <Link to="/" className="flex items-baseline gap-1.5 rounded-md">
          <span className="font-display text-xl font-semibold text-night">Find Jummah</span>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-deep">
            Near Me
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <nav
            aria-label="Primary"
            className="hidden items-center gap-x-5 text-sm text-ink-muted md:flex"
          >
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} className="hover:text-night">
                {label}
              </Link>
            ))}
          </nav>
          {isSupabaseConfigured && (
            <Link
              to={user ? "/account" : "/login"}
              className="rounded-full border border-line bg-paper-raised px-3 py-1.5 text-xs font-medium text-night"
            >
              {user ? "Account" : "Sign in"}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
