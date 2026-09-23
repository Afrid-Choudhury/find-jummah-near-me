import { directionsUrl } from "@/lib/directions";
import { COMMUNITY_UNCONFIRMED_NOTE, describeProvenance } from "@/lib/jummah";
import { masjidPageDescription, masjidPageTitle } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { formatTime } from "@/lib/utils";
import type { Masjid } from "@/types";

/**
 * Build-time HTML for one masjid page, so search engines get the name,
 * address and Jummah times as plain HTML instead of having to run the app.
 *
 * Takes the built dist/index.html as a template and changes two things: the
 * <head> (title, description, social tags, canonical) and the contents of
 * #root. The app's scripts are untouched — React mounts over #root as usual
 * and replaces this markup with the live page, refetching fresh data, so a
 * visitor never relies on the build-time snapshot for long.
 *
 * Pure: no filesystem, no network. See ./main.ts for the build step.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Websites are admin-entered, but they still end up in an href. */
function safeHttpUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th"];

function renderTimes(masjid: Masjid): string {
  if (masjid.jummahTimes.length === 0) {
    return `<p class="mt-2 text-sm text-ink-muted">No khutbah time listed yet. Please call ahead to confirm before you travel.</p>`;
  }

  const multiple = masjid.jummahTimes.length > 1;
  const items = [...masjid.jummahTimes]
    .sort((a, b) => a.khutbahNumber - b.khutbahNumber)
    .map((time) => {
      const { kind, label } = describeProvenance(time);
      const heading = multiple
        ? `${ORDINALS[time.khutbahNumber - 1] ?? `#${time.khutbahNumber}`} khutbah`
        : "Khutbah";
      const iqamah = time.iqamahTime ? ` · iqamah ${formatTime(time.iqamahTime)}` : "";
      const note =
        kind === "community-unconfirmed"
          ? `<p class="mt-0.5 text-xs text-ink-faint">${escapeHtml(COMMUNITY_UNCONFIRMED_NOTE)}</p>`
          : "";
      const notes = time.notes
        ? `<p class="mt-1 text-xs text-ink-muted">${escapeHtml(time.notes)}</p>`
        : "";
      return `<li class="rounded-lg border border-line p-3">
          <p class="text-sm font-medium text-night">${heading}: ${formatTime(time.khutbahTime)}${iqamah}</p>
          <p class="text-xs text-ink-muted">${escapeHtml(time.language)} khutbah</p>
          ${notes}
          <p class="mt-1 text-xs text-ink-muted">${escapeHtml(label)}</p>
          ${note}
        </li>`;
    })
    .join("\n");

  return `<ul class="mt-2 space-y-2">${items}</ul>`;
}

function renderBody(masjid: Masjid): string {
  const tel = masjid.phone
    ? `<a href="tel:${escapeHtml(masjid.phone.replace(/[^+\d]/g, ""))}" class="rounded-full border border-line bg-paper-raised px-4 py-2 font-medium text-night">Call ${escapeHtml(masjid.phone)}</a>`
    : "";
  const website = masjid.website ? safeHttpUrl(masjid.website) : null;
  const websiteLink = website
    ? `<a href="${escapeHtml(website)}" rel="noreferrer" class="rounded-full border border-line bg-paper-raised px-4 py-2 font-medium text-night">Website</a>`
    : "";
  const area = masjid.neighborhood
    ? `${escapeHtml(masjid.neighborhood)} · ${escapeHtml(masjid.borough)}`
    : escapeHtml(masjid.borough);

  return `<div class="min-h-dvh bg-paper">
  <div class="mx-auto w-full max-w-app space-y-4 px-4 pb-8 pt-4">
    <nav class="flex gap-4 text-sm text-ink-muted">
      <a href="/">Find Jummah Near Me</a>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
    </nav>
    <header>
      <h1 class="font-display text-2xl font-semibold text-night">${escapeHtml(masjid.name)}</h1>
      <p class="mt-1 text-sm text-ink-muted">${escapeHtml(masjid.address)}</p>
      <p class="text-sm text-ink-muted">${area}</p>
      <a href="${escapeHtml(directionsUrl(masjid))}" rel="noreferrer" class="mt-3 inline-flex h-11 items-center rounded-full bg-saffron px-5 text-sm font-semibold text-night">Directions</a>
    </header>
    <section>
      <h2 class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Jummah times</h2>
      ${renderTimes(masjid)}
    </section>
    ${
      tel || websiteLink
        ? `<section>
      <h2 class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Contact</h2>
      <div class="mt-2 flex flex-wrap gap-2 text-sm">${tel}${websiteLink}</div>
    </section>`
        : ""
    }
    <p class="text-sm"><a href="/" class="text-ink-muted">← All masjids in NYC</a></p>
  </div>
</div>`;
}

/**
 * Replaces the first match, failing loudly if the template changed. The
 * replacement goes through a function so `$` in a masjid's name or notes is
 * never read as a String.replace pattern like `$&`.
 */
function replaceOnce(
  html: string,
  pattern: RegExp,
  replace: (...groups: string[]) => string,
  what: string,
): string {
  if (!pattern.test(html)) {
    throw new Error(`prerender: couldn't find ${what} in dist/index.html — did index.html change?`);
  }
  return html.replace(pattern, (_match, ...groups: string[]) => replace(...groups));
}

/** Sets a <meta> tag's content, matching `attr="key"` followed by content="…". */
function setMeta(html: string, attr: "name" | "property", key: string, value: string): string {
  const pattern = new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`);
  return replaceOnce(html, pattern, (open = "", close = "") => open + value + close, `meta ${attr}="${key}"`);
}

export function renderMasjidPage(template: string, masjid: Masjid): string {
  const title = escapeHtml(masjidPageTitle(masjid));
  const description = escapeHtml(masjidPageDescription(masjid));
  const url = escapeHtml(`${SITE_URL}/masjid/${masjid.slug}`);

  let html = template;
  html = replaceOnce(html, /<title>[^<]*<\/title>/, () => `<title>${title}</title>`, "<title>");
  html = setMeta(html, "name", "description", description);
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", description);
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", description);
  // Safe here, unlike in index.html: this file is only ever served for this
  // one URL. useCanonicalUrl later sets the same value, so the signals agree.
  html = replaceOnce(
    html,
    /<\/head>/,
    () =>
      `    <link rel="canonical" href="${url}" />\n    <meta property="og:url" content="${url}" />\n  </head>`,
    "</head>",
  );
  html = replaceOnce(
    html,
    /<div id="root"><\/div>/,
    () => `<div id="root">${renderBody(masjid)}</div>`,
    '<div id="root"></div>',
  );
  return html;
}
