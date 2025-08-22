import { automergeSyncPlugin } from "@automerge/automerge-codemirror";
import { useDocHandle } from "@automerge/react";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { StateEffect, StateField } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { useEffect, useRef, useState } from "react";
import { lookup } from "../../../shared/lookup";
import "./codemirror.css";

type CodemirrorProps = {
  docUrl: string;
  path: string[];
  onChangeSelection: (from: number, to: number) => void;
  decorations: DecorationSet;
};

export const Codemirror = ({
  docUrl,
  path,
  onChangeSelection,
  decorations,
}: CodemirrorProps) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const handle = useDocHandle<any>(docUrl as any, { suspense: true });

  // Effect and field to manage external decorations without remounting editor
  const setDecorations = useRef(StateEffect.define<DecorationSet>()).current;
  const decorationsField = useRef(
    StateField.define<DecorationSet>({
      create() {
        return Decoration.none;
      },
      update(value, tr) {
        for (const e of tr.effects) {
          if (e.is(setDecorations)) return e.value;
        }
        if (tr.docChanged) return value.map(tr.changes);
        return value;
      },
      provide: (f) => EditorView.decorations.from(f),
    })
  ).current;

  const [view, setView] = useState<EditorView | null>(null);

  // Initialize the editor once
  useEffect(() => {
    if (!container) return;

    const initialDoc = lookup(handle.doc(), path);

    const view = new EditorView({
      doc: initialDoc,
      extensions: [
        basicSetup,
        automergeSyncPlugin({
          handle,
          path,
        }),
        decorationsField,
      ],
      parent: container,
    });

    setView(view);
    // Seed initial decorations
    view.dispatch({ effects: setDecorations.of(decorations) });

    return () => {
      setView(null);
      view.destroy();
    };
  }, [container, path, handle]);

  // Update decorations when the DecorationSet prop changes, without remounting
  useEffect(() => {
    if (!view) return;
    view.dispatch({
      effects: setDecorations.of(decorations),
    });
  }, [decorations]);

  return <div ref={setContainer} className="w-full h-full" />;
};
