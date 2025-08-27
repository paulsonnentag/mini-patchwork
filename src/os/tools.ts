import { Tool } from "../sdk/types";
import { EmbarkTool } from "../packages/embark";
import { MarkdownTool } from "../packages/markdown";
import { TodoTool } from "../packages/todo";
import { AutomergeUrl } from "@automerge/automerge-repo";
import { useDocument } from "@automerge/automerge-repo-react-hooks";
import { useEffect, useState } from "react";
import { PatchworkDoc } from "../sdk/types";

export const TOOLS: Tool[] = [EmbarkTool, MarkdownTool, TodoTool];

export const getEditor = (dataType: string) => {
  const tool = TOOLS.find((tool) => tool.supportsDatatypes.includes(dataType));
  return tool?.editor;
};

export const getCompatibleTools = (dataType: string) => {
  return TOOLS.filter((tool) => tool.supportsDatatypes.includes(dataType));
};

export const useSelectedTool = (
  docUrl?: AutomergeUrl
): [Tool | undefined, (toolId: string | undefined) => void] => {
  const [doc] = useDocument<PatchworkDoc>(docUrl);
  const [selectedToolId, setSelectedToolId] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    setSelectedToolId(undefined);
  }, [docUrl]);

  if (!doc) {
    return [undefined, setSelectedToolId];
  }

  const type = doc["@pathwork"].type;

  const selectedTool = selectedToolId
    ? TOOLS.find((tool) => tool.id === selectedToolId)
    : TOOLS.find((tool) => tool.supportsDatatypes.includes(type));

  return [selectedTool, setSelectedToolId];
};
