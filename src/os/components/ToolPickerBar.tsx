import { Tool } from "../../sdk/types";

type ToolPickerProps = {
  tools: Tool[];
  selectedTool: Tool | undefined;
  setSelectedTool: (tool: Tool) => void;
};

export const ToolPickerBar = ({
  tools,
  selectedTool,
  setSelectedTool,
}: ToolPickerProps) => {
  return (
    <div className="flex gap-2 p-2 border-b border-gray-200">
      <div className="flex-1" />
      {tools.map((tool) => (
        <button
          key={tool.id}
          className={`border ${
            selectedTool === tool ? "border-blue-500" : "border-gray-300"
          } rounded-md p-2`}
          onClick={() => setSelectedTool(tool)}
        >
          {tool.name}
        </button>
      ))}
    </div>
  );
};
