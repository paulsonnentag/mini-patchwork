import { AutomergeUrl, Doc, Repo } from "@automerge/automerge-repo";

export type DataType<Doc = unknown> = {
  id: string;
  name: string;
  getTitle: (doc: Doc) => string;
};

export type DataTypeTemplate<Doc = unknown> = {
  dataType: string;
  name: string;
  init: (doc: Doc, repo: Repo) => void;
};

export type EditorProps = {
  docUrl: AutomergeUrl;
};

export type Tool = {
  id: string;
  name: string;
  supportsDocument: (doc: any) => boolean;
  editor: React.FC<EditorProps>;
};

export type PatchworkDoc = {
  ["@patchwork"]: {
    type: string;
  };
};
