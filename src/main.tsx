import "./index.css";
import { RepoContext } from "@automerge/automerge-repo-react-hooks";

import ReactDOM from "react-dom/client";

import { Frame } from "./os/components/Frame";
import { CONTEXT } from "./sdk/context";
import { AutomergeUrl, Repo, DocHandle } from "@automerge/automerge-repo";

(window as any).$context = CONTEXT;

export const plugins = [
  {
    type: "patchwork:tool",
    id: "mini-patchwork",
    name: "Mini Patchwork",
    supportedDataTypes: ["account"],
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
              <Frame accountUrl={handle.url} />
            </RepoContext.Provider>
          );
          return () => root.unmount();
        },
      };
    },
  },
];
