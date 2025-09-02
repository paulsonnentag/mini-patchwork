import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useState } from "react";
import { MAIN_TOOLS, useSelectedTool } from "../tools";
import { useDocUrl } from "../useDocUrl";
import { BranchedEditor } from "./BranchedEditor";
import { DocListSidebar } from "./DocListSidebar";
import { ToolPicker } from "./ToolPicker";
import { ToolsSidebar } from "./ToolsSidebar";

export const Frame = () => {
  const [selectedDocUrl, setSelectedDocUrl] = useDocUrl();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
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
