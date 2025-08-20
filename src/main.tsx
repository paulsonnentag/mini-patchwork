import { DocHandle, isValidAutomergeUrl, Repo, RepoContext } from "@automerge/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.js";
import "./index.css";

const repo = new Repo({});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <RepoContext.Provider value={repo}>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </RepoContext.Provider>
);
