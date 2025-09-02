import { AutomergeUrl, isValidAutomergeUrl } from "@automerge/automerge-repo";
import { useEffect, useState } from "react";

export const useDocUrl = (): [
  AutomergeUrl | undefined,
  (url: AutomergeUrl | undefined) => void
] => {
  const parseHashToDocUrl = (): AutomergeUrl | undefined => {
    const hash = window.location.hash;
    if (!hash || hash.length <= 1) return;
    try {
      const url = hash.slice(1);

      if (!isValidAutomergeUrl(url)) {
        return;
      }

      return url;
    } catch {
      return;
    }
  };

  const [docUrl, setDocUrlState] = useState<AutomergeUrl | undefined>(() =>
    parseHashToDocUrl()
  );

  useEffect(() => {
    const onHashChange = () => {
      setDocUrlState(parseHashToDocUrl());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const setDocUrl = (url: AutomergeUrl | undefined) => {
    setDocUrlState(url);
    window.location.hash = url ? `#${url}` : "";
  };

  return [docUrl, setDocUrl];
};
