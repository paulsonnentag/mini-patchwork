import { Repo } from "@automerge/automerge-repo";
import { ToolProps } from "../../shared/patchwork";
import { Branched } from "./branched";
import { TodoDoc, TodoTool } from "./todo";

export const init = (doc: TodoDoc, repo: Repo) => {
  doc.todos = [];
};

export const App = ({ docUrl }: ToolProps) => {
  return <Branched docUrl={docUrl} tool={TodoTool} />;
};
