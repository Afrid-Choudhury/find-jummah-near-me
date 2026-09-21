import { useEffect } from "react";

const DEFAULT_TITLE = "Find Jummah Near Me — Friday Prayer, Found Fast";
const DEFAULT_DESCRIPTION = "Find nearby masjids and the best Jummah you can still make.";

/** Sets the tab title + meta description while mounted, restoring the defaults on unmount. */
export function useDocumentMeta(title: string, description?: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const metaDescription = document.querySelector('meta[name="description"]');
    const previousDescription = metaDescription?.getAttribute("content") ?? DEFAULT_DESCRIPTION;
    if (description && metaDescription) {
      metaDescription.setAttribute("content", description);
    }

    return () => {
      document.title = previousTitle;
      if (metaDescription) {
        metaDescription.setAttribute("content", previousDescription);
      }
    };
  }, [title, description]);
}

export { DEFAULT_TITLE, DEFAULT_DESCRIPTION };
