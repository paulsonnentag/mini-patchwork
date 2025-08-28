import { Repo } from "@automerge/automerge-repo";
import { TodoDoc, TodoEditor } from "./TodoEditor";
import { DataTypeTemplate, Tool } from "../../sdk/types";

export const TodoTool: Tool = {
  id: "todo",
  name: "Todo",
  supportsDocument: (doc) =>
    doc && doc["@patchwork"] && doc["@patchwork"].type === "todo",
  editor: TodoEditor,
};

export const TodoDataType = {
  id: "todo",
  name: "Todo",
  getTitle: (doc: TodoDoc) => doc.title,
};

export const TodoDataTypeTemplate: DataTypeTemplate<TodoDoc> = {
  dataType: "todo",
  name: "Todo",
  init: (doc: TodoDoc, repo: Repo) => {
    doc.title = "Untitled Todos";
    doc.todos = [];
  },
};
