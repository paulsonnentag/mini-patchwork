import {
  BrowserWebSocketClientAdapter,
  WebSocketClientAdapter,
} from "@automerge/automerge-repo-network-websocket";
import {
  RepoContext,
  useDocument,
} from "@automerge/automerge-repo-react-hooks";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { App as EmbarkApp, init as initEmbark } from "./examples/embark/app.js";
import { App as TodoApp, init as initTodo } from "./examples/todo/app";
import "./index.css";
import { ToolProps } from "./shared/patchwork";
import {
  AutomergeUrl,
  isValidAutomergeUrl,
  Repo,
} from "@automerge/automerge-repo";
import { TodoTool } from "./examples/todo/todo";
import { Context } from "./lib/core/context";
import { SharedContext } from "./lib/core/sharedContext";

const repo = new Repo({
  network: [new BrowserWebSocketClientAdapter("wss://sync3.automerge.org")],
  storage: new IndexedDBStorageAdapter(),
  peerId: ("shared-worker-" + Math.round(Math.random() * 10000)) as any,
  sharePolicy: async (peerId) => peerId.includes("storage-server"),
});

let url = document.location.hash.substring(1);
let docUrl: AutomergeUrl;
let handle;
if (isValidAutomergeUrl(url)) {
  handle = await repo.find(url);
  docUrl = url;
} else {
  handle = repo.create<any>({ count: 0 });
  handle.change((doc) => {
    initEmbark(doc, repo);
    //initTodo(doc, repo);
    //doc.counter = 0;
  });
  docUrl = handle.url;
  document.location.hash = docUrl;
}

(window as any).handle = handle;

const MinimalApp = ({ docUrl }: ToolProps) => {
  const [doc, changeDoc] = useDocument<any>(docUrl);

  return (
    <div>
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded-md"
        onClick={() => {
          changeDoc((doc) => {
            doc.count++;
          });
        }}
      >
        Increment
      </button>
      <p>{doc?.count}</p>
    </div>
  );
};

const context = new Context();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <RepoContext.Provider value={repo}>
    <SharedContext.Provider value={context}>
      <EmbarkApp docUrl={docUrl} />
    </SharedContext.Provider>
  </RepoContext.Provider>
);
