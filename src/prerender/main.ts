/**
 * Build step: writes dist/masjid/<slug>/index.html for every masjid.
 *
 * Runs after `vite build`, compiled by `vite build --ssr` so it can reuse the
 * app's own service and mapper (and therefore the same retraction rule —
 * a time the crowd took down never reaches the static HTML either). Vercel
 * serves these files ahead of the SPA rewrite in vercel.json; every other
 * route still falls through to dist/index.html.
 *
 * The snapshot is only as fresh as the last deploy, which is fine for search
 * engines but is why the app refetches on mount rather than trusting it.
 *
 * Never publishes mock data: without Supabase env vars (e.g. in CI) it skips.
 * A fetch failure also skips rather than failing the deploy — the site works
 * without these pages, it just loses the SEO benefit until the next build.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isSupabaseConfigured } from "@/lib/supabase";
import { fetchMasjids } from "@/services/masjidService";
import { renderMasjidPage } from "./renderMasjidPage";

const DIST = path.resolve("dist");

async function main() {
  if (!isSupabaseConfigured) {
    console.warn("prerender: Supabase env vars not set — skipping (no mock pages published).");
    return;
  }

  let masjids;
  try {
    masjids = await fetchMasjids();
  } catch (error) {
    console.warn("prerender: could not fetch masjids — skipping.", error);
    return;
  }

  const template = readFileSync(path.join(DIST, "index.html"), "utf8");
  for (const masjid of masjids) {
    const dir = path.join(DIST, "masjid", masjid.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "index.html"), renderMasjidPage(template, masjid));
  }

  const withTimes = masjids.filter((m) => m.jummahTimes.length > 0).length;
  console.log(`prerender: wrote ${masjids.length} masjid pages (${withTimes} with times).`);
}

// Not top-level await: Vite's default build target doesn't allow it. Anything
// thrown past main()'s own skips (e.g. the template check) fails the build.
main().catch((error: unknown) => {
  console.error("prerender failed:", error);
  process.exitCode = 1;
});
