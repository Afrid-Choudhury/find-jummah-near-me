// Writes public/sitemap.xml. With Supabase env vars set, includes every
// masjid detail page; otherwise falls back to just the static routes so
// this is always safe to run (e.g. as a Vercel build step).
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = process.env.SITE_URL ?? "https://findjummahnearme.com";

const staticRoutes = ["/"];

async function fetchMasjidSlugs() {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.warn("Supabase env vars not set — sitemap will only include static routes.");
    return [];
  }

  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase.from("masjids").select("slug");
  if (error) {
    console.warn("Could not fetch masjid slugs for sitemap:", error.message);
    return [];
  }
  return data.map((row) => row.slug);
}

function buildXml(paths) {
  const urls = paths
    .map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

const slugs = await fetchMasjidSlugs();
const paths = [...staticRoutes, ...slugs.map((slug) => `/masjid/${slug}`)];
writeFileSync("public/sitemap.xml", buildXml(paths));
console.log(`Wrote public/sitemap.xml with ${paths.length} URLs.`);
