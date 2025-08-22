import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import {
  AutomergeUrl,
  IndexedDBStorageAdapter,
  isValidAutomergeUrl,
  Repo,
  RepoContext,
} from "@automerge/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { App as EmbarkApp, init as initEmbark } from "./examples/embark/app.js";
import "./index.css";

const repo = new Repo({
  storage: new IndexedDBStorageAdapter(),
  network: [new BrowserWebSocketClientAdapter("wss://sync3.automerge.org")],
});

let url = document.location.hash.substring(1);
let docUrl: AutomergeUrl;
let handle;
if (isValidAutomergeUrl(url)) {
  handle = await repo.find(url);
  docUrl = url;
} else {
  console.log("init");
  handle = repo.create<any>({ count: 0 });
  handle.change((doc) => {
    initEmbark(doc, repo);
  });
  docUrl = handle.url;
  document.location.hash = docUrl;
}

(window as any).handle = handle;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <RepoContext.Provider value={repo}>
    <React.StrictMode>
      <EmbarkApp docUrl={docUrl} />
    </React.StrictMode>
  </RepoContext.Provider>
);
