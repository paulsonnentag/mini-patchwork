import { Repo } from "@automerge/automerge-repo";
import { DataTypeTemplate, Tool } from "../../sdk/types";
import { outdent } from "../../lib/outdents";
import { MarkdownDoc } from "../markdown/MarkdownEditor";
import { EmbarkEditor } from "./EmbarkEditor";
import { LocationDoc } from "./MapView";

export const EmbarkTool: Tool = {
  id: "embark",
  name: "Embark",
  supportsDocument: (doc) => doc["@patchwork"].type === "markdown",
  editor: EmbarkEditor,
};

export const EmbarkTemplate: DataTypeTemplate<MarkdownDoc> = {
  dataType: "markdown",
  name: "Embark",
  init(doc: MarkdownDoc, repo: Repo) {
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
  },
};
