import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SITE_URL } from "@/lib/site";

function upsertHeadTag(selector: string, create: () => HTMLElement): HTMLElement {
  const existing = document.head.querySelector<HTMLElement>(selector);
  if (existing) return existing;
  const tag = create();
  document.head.appendChild(tag);
  return tag;
}

/**
 * Points <link rel="canonical"> and og:url at SITE_URL + the current path,
 * whichever host the page was actually served from. Query strings, hashes and
 * trailing slashes are dropped: `/?q=astoria` is the homepage, not a separate
 * page.
 *
 * Deliberately not in index.html: that file is served for every route, so a
 * static canonical there would claim every masjid page is the homepage, and
 * Google treats a raw-HTML canonical that JS later changes as a mixed signal.
 */
export function useCanonicalUrl() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Vercel serves /masjid/x and /masjid/x/ alike (the pre-rendered page is
    // x/index.html), so both must name the same slash-less canonical.
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
    const url = SITE_URL + path;

    const canonical = upsertHeadTag('link[rel="canonical"]', () => {
      const link = document.createElement("link");
      link.rel = "canonical";
      return link;
    });
    canonical.setAttribute("href", url);

    const ogUrl = upsertHeadTag('meta[property="og:url"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:url");
      return meta;
    });
    ogUrl.setAttribute("content", url);
  }, [pathname]);
}
