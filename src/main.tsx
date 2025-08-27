import { Repo } from "@automerge/automerge-repo";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { RepoContext } from "@automerge/automerge-repo-react-hooks";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Frame } from "./os/components/Frame";
import { SharedContext } from "./sdk/context/core/sharedContext";
import { Context } from "./sdk/context/core/context";

const repo = new Repo({
  network: [new BrowserWebSocketClientAdapter("wss://sync3.automerge.org")],
  storage: new IndexedDBStorageAdapter(),
});

const context = new Context();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <RepoContext.Provider value={repo}>
    <SharedContext.Provider value={context}>
      <Frame />
    </SharedContext.Provider>
  </RepoContext.Provider>
);
