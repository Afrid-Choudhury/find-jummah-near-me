import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/supabase";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

/**
 * One row on tablets and up; on phones the nav drops to a second strip so the
 * name and Sign in keep their room. Its height is what the homepage's sticky
 * search offsets against (5.5rem on phones, 3.5rem from `md`).
 */
export function Header() {
  const { user } = useAuth();

  const links = NAV_LINKS.map(({ to, label }) => (
    <Link key={to} to={to} className="hover:text-night">
      {label}
    </Link>
  ));

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
            {links}
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
      <nav
        aria-label="Primary"
        className="flex h-8 items-center gap-x-4 border-t border-line px-4 text-xs text-ink-muted md:hidden"
      >
        {links}
      </nav>
    </header>
  );
}
