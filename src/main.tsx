import { Repo } from "@automerge/automerge-repo";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { RepoContext } from "@automerge/automerge-repo-react-hooks";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Frame } from "./os/components/Frame";
import { CONTEXT } from "./sdk/context";

const repo = new Repo({
  network: [new BrowserWebSocketClientAdapter("wss://sync3.automerge.org")],
  storage: new IndexedDBStorageAdapter(),
});

(window as any).$context = CONTEXT;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <RepoContext.Provider value={repo}>
    <Frame />
  </RepoContext.Provider>
);
