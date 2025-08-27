import { EditorProps } from "../../sdk/types";
import { MarkdownEditor } from "../markdown/MarkdownEditor";
import { MapView } from "./MapView";

export const EmbarkEditor = ({ docUrl }: EditorProps) => {
  return (
    <div className="flex gap-2 w-full h-full p-2">
      <MarkdownEditor docUrl={docUrl} />
      <MapView />
    </div>
  );
};
