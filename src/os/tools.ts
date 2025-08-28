import { Tool } from "../sdk/types";
import { EmbarkTool } from "../packages/embark";
import { MarkdownTool } from "../packages/markdown";
import { TodoTool } from "../packages/todo";
import { AutomergeUrl } from "@automerge/automerge-repo";
import { useDocument } from "@automerge/automerge-repo-react-hooks";
import { useEffect, useState } from "react";
import { PatchworkDoc } from "../sdk/types";

export const MAIN_TOOLS: Tool[] = [MarkdownTool, EmbarkTool, TodoTool];

export const SIDEBAR_TOOLS: Tool[] = [];

export const getCompatibleMainTools = (doc: any) => {
  MAIN_TOOLS.filter((tool) => tool.supportsDocument(doc));
};

export const getCompatibleSidebarTools = (doc: any) => {
  SIDEBAR_TOOLS.filter((tool) => tool.supportsDocument(doc));
};

export const useSelectedTool = (
  tools: Tool[],
  docUrl?: AutomergeUrl
): {
  selectedTool: Tool | undefined;
  setSelectedTool: (tool: Tool) => void;
  tools: Tool[];
} => {
  const [doc] = useDocument<PatchworkDoc>(docUrl);
  const [selectedToolId, setSelectedToolId] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    setSelectedToolId(undefined);
  }, [docUrl]);

  if (!doc) {
    return {
      selectedTool: undefined,
      setSelectedTool: () => {},
      tools: [],
    };
  }

  const supportedTools = tools.filter((tool) => tool.supportsDocument(doc));

  const selectedTool = selectedToolId
    ? supportedTools.find((tool) => tool.id === selectedToolId)
    : supportedTools[0];

  return {
    selectedTool,
    setSelectedTool: (tool: Tool) => setSelectedToolId(tool.id),
    tools: supportedTools,
  };
};
