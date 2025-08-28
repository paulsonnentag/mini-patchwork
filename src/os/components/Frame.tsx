import { AutomergeUrl, isValidAutomergeUrl } from "@automerge/automerge-repo";
import { useDocument, useRepo } from "@automerge/automerge-repo-react-hooks";
import { useEffect, useState } from "react";
import { PatchworkDoc } from "../../sdk/types";
import { MAIN_TOOLS, useSelectedTool } from "../tools";
import { BranchedEditor } from "./BranchedEditor";
import { DocListSidebar } from "./DocListSidebar";
import { ToolPicker } from "./ToolPicker";
import { ToolsSidebar } from "./ToolsSidebar";
import { getDataType } from "../datatypes";
import { PanelRightOpen, PanelRightClose } from "lucide-react";

export const Frame = () => {
  const [selectedDocUrl, setSelectedDocUrl] = useDocUrl();
  const [doc] = useDocument<PatchworkDoc>(selectedDocUrl);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const {
    selectedTool: selectedMainTool,
    setSelectedTool: setSelectedMainTool,
    tools: mainTools,
  } = useSelectedTool(MAIN_TOOLS, selectedDocUrl);

  const dataType = doc ? getDataType(doc) : undefined;

  return (
    <div className="h-screen w-screen flex">
      <DocListSidebar
        selectedDocUrl={selectedDocUrl}
        setSelectedDocUrl={setSelectedDocUrl}
      />

      <div className="flex-1 flex flex-col">
        <div className="flex gap-2 p-2 border-b border-gray-200 items-center">
          <ToolPicker
            selectedTool={selectedMainTool}
            setSelectedTool={setSelectedMainTool}
            tools={mainTools}
          />

          <div className="flex-1" />

          <button
            className="p-2 hover:bg-gray-100 rounded-md"
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          >
            {isSidebarExpanded ? <PanelRightClose /> : <PanelRightOpen />}
          </button>
        </div>

        {selectedMainTool && selectedDocUrl && (
          <BranchedEditor
            docUrl={selectedDocUrl}
            tool={selectedMainTool.component}
            key={selectedDocUrl}
          />
        )}
      </div>

      {selectedDocUrl && isSidebarExpanded && (
        <ToolsSidebar docUrl={selectedDocUrl} />
      )}
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
