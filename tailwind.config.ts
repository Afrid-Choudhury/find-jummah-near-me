import type { Config } from "tailwindcss";

/**
 * Jummah NYC design tokens.
 *
 * Palette: deep masjid green anchored by a saffron/gold accent on warm paper —
 * derived from the green domes and gilded calligraphy of NYC masjids, not from
 * a generic UI kit. All components consume these tokens; never hard-code hex
 * values in components.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: {
          DEFAULT: "#0d3b2e", // deep dome green — headers, primary text on light
          soft: "#14513f",
          deep: "#082a1f",
        },
        saffron: {
          DEFAULT: "#d9a441", // gilded accent — Jummah time highlights, CTAs
          soft: "#f0d9a8",
          deep: "#b3802a",
        },
        paper: {
          DEFAULT: "#faf7f0", // warm paper background
          raised: "#ffffff",
          sunken: "#f1ece0",
        },
        ink: {
          DEFAULT: "#1c2b26", // body text
          muted: "#5c6b64",
          faint: "#93a09a",
        },
        line: "#e4ddcd", // hairline borders
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        card: "1rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(13, 59, 46, 0.06), 0 4px 12px rgba(13, 59, 46, 0.05)",
        raised: "0 2px 4px rgba(13, 59, 46, 0.08), 0 8px 24px rgba(13, 59, 46, 0.10)",
      },
      maxWidth: {
        app: "28rem", // mobile-first shell; centered column on desktop
      },
    },
  },
  plugins: [],
} satisfies Config;
