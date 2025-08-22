import { Repo } from "@automerge/react";
import { useEffect, useMemo } from "react";
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

  const aachenDocHandle = repo.create<LocationDoc>();
  aachenDocHandle.change((doc) => {
    doc.title = "Aachen";
    doc.lat = 50.7753;
    doc.lng = 6.0839;
  });

  doc.content = outdent`
    # Some places

    - [Paris](#paris--${parisDocHandle.documentId})
    - [London](#london--${londonDocHandle.documentId})
    - [Aachen](#aachen--${aachenDocHandle.documentId})
  `;
};

export const App = ({ docUrl }: ToolProps) => {
  const context = useMemo(() => new Context(), []);

  useEffect(
    () =>
      context.onChange(() => {
        console.log("context", context.dump());
      }),
    [context]
  );

  return (
    <SharedContext.Provider value={context}>
      <div className="flex gap-2 w-screen h-screen p-2">
        <MarkdownTool docUrl={docUrl} />
        <MapView />
      </div>
    </SharedContext.Provider>
  );
};
