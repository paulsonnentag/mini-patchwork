import { AutomergeUrl, DocHandle, Repo } from "@automerge/automerge-repo";
import { RepoContext } from "@automerge/automerge-repo-react-hooks";
import ReactDOM from "react-dom/client";
import { BranchedEditor } from "./BranchedEditor";
import "./index.css";

export const plugins = [
  {
    type: "patchwork:tool",
    id: "mini-patchwork",
    name: "Mini Patchwork",
    supportedDataTypes: "*",
    async load() {
      return {
        render({
          element,
          handle,
          repo,
        }: {
          element: HTMLElement;
          handle: DocHandle<{ documents: AutomergeUrl[] }>;
          repo: Repo;
        }) {
          const root = ReactDOM.createRoot(element);
          root.render(
            <RepoContext.Provider value={repo}>
              <BranchedEditor docUrl={handle.url} />
            </RepoContext.Provider>
          );
          return () => root.unmount();
        },
      };
    },
  },
];
