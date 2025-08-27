import { RangeSet } from "@codemirror/state";
import { Decoration, DecorationSet } from "@codemirror/view";
import { useEffect, useMemo, useState } from "react";
import { defineField } from "../../sdk/context/core/fields";
import { ObjRef, PathRef, TextSpanRef } from "../../sdk/context/core/objRefs";
import { useSharedContext } from "../../sdk/context/core/sharedContext";
import { useSelection } from "../../sdk/context/selection";
import { useStaticCallback } from "../../lib/useStaticCalback";
import {
  useDocHandle,
  useDocument,
  useRepo,
} from "@automerge/automerge-repo-react-hooks";
import { DocHandle, DocumentId, Repo } from "@automerge/automerge-repo";
import { EditorProps } from "../../sdk/types";
import { Codemirror } from "./lib/codemirror";
import { useGetDiffsAt } from "../../sdk/context/diff";

export type MarkdownDoc = {
  content: string;
};

const Link = defineField<{ target: ObjRef }>("Link");

const PATH = ["content"];

export const MarkdownEditor = ({ docUrl }: EditorProps) => {
  const repo = useRepo();
  const [doc] = useDocument(docUrl, { suspense: true });
  const handle = useDocHandle<MarkdownDoc>(docUrl, { suspense: true });
  const context = useSharedContext();
  const { isSelected, setSelection } = useSelection();

  const getDiffsAt = useGetDiffsAt();

  console.log("getAllDiffs", getDiffsAt(new PathRef(handle, ["content"])));

  // parse links
  const [linkedDocs, setLinkedDocs] = useState<LinkedDocs[]>([]);
  useEffect(() => {
    let isCanceled = false;

    parseMarkdownLinks(repo, handle).then((links) => {
      if (isCanceled) {
        return;
      }
      setLinkedDocs(links);
    });

    return () => {
      isCanceled = true;
    };
  }, [repo, handle, doc]);

  // add links to context
  useEffect(
    () =>
      context.change((context) => {
        linkedDocs.forEach((linkedDoc) => {
          context.add(linkedDoc.docRef);
          context.add(linkedDoc.linkRef).with(
            Link({
              target: linkedDoc.docRef,
            })
          );
        });
      }),
    [linkedDocs]
  );

  // compute decorations from links
  const decorations = useMemo<DecorationSet>(
    () =>
      RangeSet.of<Decoration>(
        linkedDocs.map((linkedDoc) => {
          const isLinkSelected =
            isSelected(linkedDoc.linkRef) || isSelected(linkedDoc.docRef);

          return Decoration.mark({
            class: isLinkSelected ? "bg-yellow-200" : "bg-yellow-100",
          }).range(linkedDoc.linkRef.from, linkedDoc.linkRef.to);
        }),
        true // sort ranges
      ),
    [linkedDocs, isSelected]
  );

  const onChangeSelection = useStaticCallback((from: number, to: number) => {
    const selectedText = new TextSpanRef(handle, ["content"], from, to);
    const overlappingLinks = linkedDocs.filter((linkedDoc) =>
      selectedText.doesOverlap(linkedDoc.linkRef)
    );

    const selectedObjects: ObjRef[] = [
      selectedText,
      ...overlappingLinks.map((linkedDoc) => linkedDoc.docRef),
    ];

    setSelection(selectedObjects);
  });

  return (
    <div className="w-full h-full border border-gray-300">
      <Codemirror
        docUrl={docUrl}
        path={PATH}
        onChangeSelection={onChangeSelection}
        decorations={decorations}
      />
    </div>
  );
};

type LinkedDocs = {
  linkRef: TextSpanRef;
  docRef: ObjRef;
};

const parseMarkdownLinks = async (
  repo: Repo,
  handle: DocHandle<MarkdownDoc>
): Promise<LinkedDocs[]> => {
  const links: LinkedDocs[] = [];
  // Single regex to match markdown links with the specific pattern: [text](anything--documentId) or [text](anything--documentId?params)
  const regex = /\[([^\]]*)\]\(([^)]*)--([A-Za-z0-9_-]+)(\?[^)]*)?\)/g;
  const content = handle.doc().content;

  let match;
  while ((match = regex.exec(content)) !== null) {
    const fullMatch = match[0];
    const documentId = match[3];
    const from = match.index;
    const to = match.index + fullMatch.length;

    const docHandle = await repo.find(documentId as DocumentId);

    links.push({
      linkRef: new TextSpanRef(handle, ["content"], from, to),
      docRef: new PathRef(docHandle, []),
    });
  }

  return links;
};
