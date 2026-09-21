import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-line px-4 py-6">
      <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
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
    </footer>
  );
}
