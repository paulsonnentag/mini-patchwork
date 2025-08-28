import { Tool } from "../../sdk/types";
import { MapView } from "./MapView";

export const MapTool: Tool = {
  id: "map",
  name: "Map",
  supportsDocument: () => true,
  component: MapView,
};
