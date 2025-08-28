import { AutomergeUrl, isValidAutomergeUrl } from "@automerge/automerge-repo";
import { useDocument, useRepo } from "@automerge/automerge-repo-react-hooks";
import { useEffect, useState } from "react";
import { PatchworkDoc } from "../../sdk/types";
import { MAIN_TOOLS, useSelectedTool } from "../tools";
import { BranchedEditor } from "./BranchedEditor";
import { DocListSidebar } from "./DocListSidebar";
import { ToolPickerBar } from "./ToolPickerBar";

export const Frame = () => {
  const [selectedDocUrl, setSelectedDocUrl] = useDocUrl();
  const {
    selectedTool: selectedMainTool,
    setSelectedTool: setSelectedMainTool,
    tools: mainTools,
  } = useSelectedTool(MAIN_TOOLS, selectedDocUrl);

  return (
    <div className="h-screen w-screen flex">
      <DocListSidebar
        selectedDocUrl={selectedDocUrl}
        setSelectedDocUrl={setSelectedDocUrl}
      />

      <div className="flex-1 flex flex-col">
        <ToolPickerBar
          selectedTool={selectedMainTool}
          setSelectedTool={setSelectedMainTool}
          tools={mainTools}
        />

        {selectedMainTool && selectedDocUrl && (
          <BranchedEditor
            docUrl={selectedDocUrl}
            tool={selectedMainTool.editor}
            key={selectedDocUrl}
          />
        )}
      </div>
    </div>
  );
};

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
