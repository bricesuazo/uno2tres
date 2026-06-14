import { useEffect } from "react";

const SUFFIX = "uno2tres";

/** Set the document <title> for the current page. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX;
  }, [title]);
}
