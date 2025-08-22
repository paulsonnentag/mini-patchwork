import * as Automerge from "@automerge/automerge";
import { useDocument } from "@automerge/react";
import { ToolProps } from "../../shared/patchwork";
import { useMemo } from "react";

const DiffTool = ({ docUrl }: ToolProps) => {
  const fromHeads: Automerge.Heads[] = [];
  const toHeads: Automerge.Heads[] = [];
  const [doc, changeDoc] = useDocument(docUrl, { suspense: true });

  const diff = useMemo(() => {
    const fromHeads = Automerge.getHeads(doc);
    const toHeads = Automerge.getHeads(doc);
    return Automerge.diff(doc, fromHeads, toHeads);
  }, [doc]);

  Automerge.next;
};




useDiff({


])