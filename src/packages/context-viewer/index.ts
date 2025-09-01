import { Tool } from "../../sdk/types";
import { ContextViewer } from "./ContextViewer";

export const ContextViewerTool: Tool = {
  id: "context-viewer",
  name: "Context",
  supportsDocument: () => true,
  component: ContextViewer,
};
