import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/supabase";

export function Header() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-baseline gap-1.5 rounded-md">
          <span className="font-display text-xl font-semibold text-night">Find Jummah</span>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-deep">
            Near Me
          </span>
        </Link>
        {isSupabaseConfigured && (
          <Link
            to={user ? "/account" : "/login"}
            className="rounded-full border border-line bg-paper-raised px-3 py-1.5 text-xs font-medium text-night"
          >
            {user ? "Account" : "Sign in"}
          </Link>
        )}
      </div>
      <nav
        aria-label="Primary"
        className="flex h-8 items-center gap-x-4 border-t border-line px-4 text-xs text-ink-muted"
      >
        <Link to="/" className="hover:text-night">
          Home
        </Link>
        <Link to="/about" className="hover:text-night">
          About
        </Link>
        <Link to="/contact" className="hover:text-night">
          Contact
        </Link>
      </nav>
    </header>
  );
}
