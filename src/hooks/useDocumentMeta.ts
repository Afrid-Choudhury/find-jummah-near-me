import { useEffect } from "react";

const DEFAULT_TITLE = "Find Jummah Near Me — Friday Prayer, Found Fast";
const DEFAULT_DESCRIPTION = "Find nearby masjids and the best Jummah you can still make.";

/**
 * Sets the tab title + meta description while mounted, restoring the site
 * defaults on unmount.
 *
 * Restores the defaults rather than whatever was there at mount: a
 * pre-rendered masjid page arrives with that masjid's title already in the
 * HTML, so "previous" would carry it onto the next page the visitor opens.
 */
export function useDocumentMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title;

    const metaDescription = document.querySelector('meta[name="description"]');
    if (description && metaDescription) {
      metaDescription.setAttribute("content", description);
    }

    return () => {
      document.title = DEFAULT_TITLE;
      metaDescription?.setAttribute("content", DEFAULT_DESCRIPTION);
    };
  }, [title, description]);
}

export { DEFAULT_TITLE, DEFAULT_DESCRIPTION };
