import { useEffect, useRef, useState } from "react";
import { ToolProps } from "../../sdk/types";
import { SIDEBAR_TOOLS, useSelectedTool } from "../tools";
import { ToolPicker } from "./ToolPicker";

export const ToolsSidebar = ({ docUrl }: ToolProps) => {
  const { selectedTool, setSelectedTool, tools } = useSelectedTool(
    SIDEBAR_TOOLS,
    docUrl
  );

  const MIN_WIDTH = 240;
  const MAX_WIDTH = Infinity;

  const [width, setWidth] = useState<number>(() => {
    const stored = localStorage.getItem("patchwork:toolsSidebarWidth");
    const parsed = stored ? parseInt(stored, 10) : NaN;
    return Number.isFinite(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH
      ? parsed
      : 400;
  });

  useEffect(() => {
    localStorage.setItem("patchwork:toolsSidebarWidth", String(width));
  }, [width]);

  const startXRef = useRef<number | null>(null);
  const startWidthRef = useRef<number>(width);

  const stopResizing = () => {
    startXRef.current = null;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  };

  const onMouseMove = (event: MouseEvent) => {
    if (startXRef.current === null) return;
    const delta = startXRef.current - event.clientX;
    const next = Math.min(
      MAX_WIDTH,
      Math.max(MIN_WIDTH, startWidthRef.current + delta)
    );
    setWidth(next);
  };

  const onMouseUp = () => {
    stopResizing();
  };

  const onMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    startXRef.current = event.clientX;
    startWidthRef.current = width;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    event.preventDefault();
  };

  return (
    <div
      className="relative flex flex-col border-l border-gray-300"
      style={{ width }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10"
        onMouseDown={onMouseDown}
      />
      <div className="flex items-center p-2 border-b border-gray-300">
        <ToolPicker
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          tools={tools}
        />
        <div className="flex-1" />
      </div>
      <div className="flex-1 overflow-auto">
        {selectedTool && <selectedTool.component docUrl={docUrl} />}
      </div>
    </div>
  );
};
