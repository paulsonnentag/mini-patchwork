import { AutomergeUrl, useDocument } from "@automerge/react";
import { ToolProps } from "../../shared/patchwork";
import { useState } from "react";
import { ObjRef } from "../../lib/core/objRefs";

type Todo = {
  id: string;
  description: string;
  done: boolean;
};

type TodoDoc = {
  todos: Todo[];
};

export const TodoTool = ({ docUrl }: ToolProps) => {
  const [doc, changeDoc] = useDocument<TodoDoc>(docUrl, { suspense: true });
  const [text, setText] = useState("");

  const addTodo = () => {
    if (text.trim() === "") return;
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      description: text,
      done: false,
    };
    changeDoc((doc) => {
      doc.todos.push(newTodo);
    });
    setText("");
  };

  const toggleTodo = (id: string) => {
    changeDoc((doc) => {
      const todo = doc.todos.find((todo) => todo.id === id);
      if (todo) {
        todo.done = !todo.done;
      }
    });
  };

  const updateTodoDescription = (id: string, description: string) => {
    changeDoc((doc) => {
      const todo = doc.todos.find((todo) => todo.id === id);
      if (todo) {
        todo.description = description;
      }
    });
  };

  return (
    <div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a new todo"
      />
      <button onClick={addTodo}>Add</button>
      {doc.todos.map((todo) => (
        const todoRef = getId(docHandle, ["todos", todo.id])
      ))}
    </div>
  );
};

type TodoItemProps = {
  todo: ObjRef<Todo>
}

const TodoItem = ({ todo }: TodoItemProps) => {

<div key={todo.id}>
          <input
            type="checkbox"
            checked={todo.done}
            onChange={() => toggleTodo(todo.id)}
          />
          <input
            value={todo.description}
            onChange={(e) => updateTodoDescription(todo.id, e.target.value)}
          />
        </div>

};

const useDiff = (docUrl: AutomergeUrl) => {
  throw new Error("Function not implemented.");
};
