import { Tool } from "../sdk/types";
import { EmbarkTool } from "../packages/embark";
import { MarkdownTool } from "../packages/markdown";
import { TodoTool } from "../packages/todo";

export const TOOLS: Tool[] = [EmbarkTool, MarkdownTool, TodoTool];

export const getEditor = (dataType: string) => {
  const tool = TOOLS.find((tool) => tool.supportsDatatypes.includes(dataType));
  return tool?.editor;
};
