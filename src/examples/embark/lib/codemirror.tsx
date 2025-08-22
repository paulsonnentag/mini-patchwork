import { automergeSyncPlugin } from "@automerge/automerge-codemirror";
import { useDocHandle } from "@automerge/react";
import { DecorationSet, EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { useEffect, useState } from "react";
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
      ],
      parent: container,
    });

    return () => {
      view.destroy();
    };
  }, [container, path, handle]);

  return <div ref={setContainer} className="w-full h-full" />;
};
