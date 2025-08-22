import { Repo } from "@automerge/react";
import { useMemo } from "react";
import { Context } from "../../lib/core/context";
import { SharedContext } from "../../lib/core/sharedContext";
import { ToolProps } from "../../shared/patchwork";
import { LocationDoc, MapView } from "./map";
import { MarkdownDoc, MarkdownTool } from "./markdown";
import { outdent } from "../../shared/outdents";

export const init = (doc: MarkdownDoc, repo: Repo) => {
  const parisDocHandle = repo.create<LocationDoc>();
  parisDocHandle.change((doc) => {
    doc.title = "Paris";
    doc.lat = 48.8566;
    doc.lng = 2.3522;
  });

  const londonDocHandle = repo.create<LocationDoc>();
  londonDocHandle.change((doc) => {
    doc.title = "London";
    doc.lat = 51.5074;
    doc.lng = -0.1278;
  });

  doc.content = outdent`
    # Some places

    - [Paris](#paris--${parisDocHandle.documentId})
    - [London](#london--${londonDocHandle.documentId})
  `;
};

export const App = ({ docUrl }: ToolProps) => {
  const context = useMemo(() => new Context(), []);

  return (
    <SharedContext.Provider value={context}>
      <div className="flex gap-2 w-full h-full">
        <MarkdownTool docUrl={docUrl} />
        <MapView />
      </div>
    </SharedContext.Provider>
  );
};
