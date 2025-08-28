import { Tool } from "../../sdk/types";
import { PotluckEditor } from "./PotluckEditor";

export const PotluckTool: Tool = {
  id: "potluck",
  name: "Potluck",
  supportsDocument: (doc) => true,
  component: PotluckEditor,
};
