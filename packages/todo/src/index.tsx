import { AutomergeUrl, DocHandle, Repo } from "@automerge/automerge-repo";
import { RepoContext } from "@automerge/automerge-repo-react-hooks";
import ReactDOM from "react-dom/client";
import { TodoEditor } from "./TodoEditor";
import "./index.css";

export const plugins = [
  {
    type: "patchwork:tool",
    id: "todo",
    name: "Todo",
    supportedDataTypes: ["todo"],
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
              <TodoEditor docUrl={handle.url} />
            </RepoContext.Provider>
          );
          return () => root.unmount();
        },
      };
    },
  },
];
