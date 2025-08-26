import { Repo } from "@automerge/automerge-repo";
import { outdent } from "../../shared/outdents";
import { ToolProps } from "../../shared/patchwork";
import { LocationDoc, MapView } from "./map";
import { MarkdownDoc, MarkdownTool } from "./markdown";

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
  return (
    <div className="flex gap-2 w-screen h-screen p-2">
      <MarkdownTool docUrl={docUrl} />
      <MapView />
    </div>
  );
};
