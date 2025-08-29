import { RangeSet } from "@codemirror/state";
import { Decoration, DecorationSet, WidgetType } from "@codemirror/view";
import { useContext, useEffect, useMemo, useState } from "react";
import { defineField } from "../../sdk/context/core/fields";
import { ObjRef, PathRef, TextSpanRef } from "../../sdk/context/core/objRefs";
import {
  useDerivedSharedContext,
  useSharedContext,
} from "../../sdk/context/core/sharedContext";
import { useSelection } from "../../sdk/context/selection";
import { useStaticCallback } from "../../lib/useStaticCalback";
import {
  useDocHandle,
  useDocument,
  useRepo,
} from "@automerge/automerge-repo-react-hooks";
import { DocHandle, DocumentId, Repo } from "@automerge/automerge-repo";
import { ToolProps } from "../../sdk/types";
import { Codemirror } from "./lib/codemirror";
import { DiffValue, useGetDiffsAt } from "../../sdk/context/diff";

export type MarkdownDoc = {
  content: string;
};

const Link = defineField<{ target: ObjRef }>("Link");

const PATH = ["content"];

export const MarkdownEditor = ({ docUrl }: ToolProps) => {
  const repo = useRepo();
  const [doc] = useDocument<MarkdownDoc>(docUrl);
  const handle = useDocHandle<MarkdownDoc>(docUrl);
  const { isSelected, setSelection, selectedObjRefs } = useSelection();
  const context = useSharedContext();
  const getDiffsAt = useGetDiffsAt();

  // todo:  another weird doc handle issue

  const contentRef = useMemo(() => {
    if (!handle || (handle.doc() as any)["@patchwork"]?.type !== "markdown") {
      return undefined;
    }
    return new PathRef(handle, ["content"]);
  }, [handle]);

  const contentDiffs = getDiffsAt(contentRef);

  // parse links
  const [linkedDocs, setLinkedDocs] = useState<LinkedDocs[]>([]);
  useEffect(() => {
    let isCanceled = false;

    if (!handle) {
      setLinkedDocs([]);
      return;
    }

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

  //  add links and content to context
  const content = doc?.content as string;
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

        if (content && handle) {
          context.add(new PathRef(handle, ["content"]));
        }
      }),
    [linkedDocs, handle]
  );

  // compute decorations
  const decorations = useMemo<DecorationSet>(() => {
    return RangeSet.of<Decoration>(
      [
        // links
        ...linkedDocs.map((linkedDoc) => {
          const isLinkSelected =
            isSelected(linkedDoc.linkRef) || isSelected(linkedDoc.docRef);

          return Decoration.mark({
            class: isLinkSelected ? "bg-yellow-200" : "bg-yellow-100",
          }).range(linkedDoc.linkRef.from, linkedDoc.linkRef.to);
        }),

        // diff
        ...contentDiffs.flatMap((annotation) => {
          const diff = annotation.field as DiffValue<string>;
          const textSpan = annotation.objRef as TextSpanRef;

          if (diff.type === "deleted") {
            return makeDeleteDecoration({
              deletedText: diff.before,
              isActive: isSelected(textSpan),
            }).range(textSpan.from, textSpan.from);
          }

          if (diff.type === "added") {
            return Decoration.mark({
              class: `border-b border-green-300 ${
                isSelected(textSpan) ? "bg-green-300" : "bg-green-100"
              }`,
            }).range(textSpan.from, textSpan.to);
          }

          return [];
        }),

        // selection
        ...selectedObjRefs.flatMap((selectedObjRef) => {
          if (
            !(selectedObjRef instanceof TextSpanRef) ||
            !contentRef ||
            !selectedObjRef.isPartOf(contentRef) ||
            selectedObjRef.from === selectedObjRef.to
          ) {
            return [];
          }

          return Decoration.mark({
            class: "bg-blue-200",
          }).range(selectedObjRef.from, selectedObjRef.to);
        }),
      ],
      true // sort ranges
    );
  }, [linkedDocs, isSelected, contentDiffs, selectedObjRefs]);

  const onChangeSelection = useStaticCallback((from: number, to: number) => {
    if (!handle) {
      return;
    }

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
    <div className="w-full h-full">
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

class DeletionMarker extends WidgetType {
  deletedText: string;
  isActive: boolean;

  constructor(deletedText: string, isActive: boolean) {
    super();
    this.deletedText = deletedText;
    this.isActive = isActive;
  }

  toDOM(): HTMLElement {
    const box = document.createElement("div");
    box.style.display = "inline-block";
    box.style.boxSizing = "border-box";
    box.style.padding = "0 2px";
    box.style.color = "rgb(236 35 35)";
    box.style.margin = "0 4px";
    box.style.fontSize = "0.8em";
    box.style.backgroundColor = this.isActive
      ? "rgb(255 0 0 / 20%)"
      : "rgb(255 0 0 / 10%)";
    box.style.borderRadius = "3px";
    box.style.cursor = "default";
    box.innerText = "⌫";

    const hoverText = document.createElement("div");
    hoverText.style.position = "absolute";
    hoverText.style.zIndex = "1";
    hoverText.style.padding = "10px";
    hoverText.style.backgroundColor = "rgb(255 230 230)";
    hoverText.style.fontSize = "15px";
    hoverText.style.color = "black";
    hoverText.style.padding = "5px";
    hoverText.style.border = "rgb(100 55 55)";
    hoverText.style.boxShadow = "0px 0px 6px rgba(0, 0, 0, 0.1)";
    hoverText.style.borderRadius = "3px";
    hoverText.style.visibility = "hidden";
    hoverText.innerText = this.deletedText;

    box.appendChild(hoverText);

    box.onmouseover = function () {
      hoverText.style.visibility = "visible";
    };
    box.onmouseout = function () {
      hoverText.style.visibility = "hidden";
    };

    return box;
  }

  eq(other: DeletionMarker) {
    return (
      other.deletedText === this.deletedText && other.isActive === this.isActive
    );
  }

  ignoreEvent() {
    return true;
  }
}

const makeDeleteDecoration = ({
  deletedText,
  isActive,
}: {
  deletedText: string;
  isActive: boolean;
}) =>
  Decoration.widget({
    widget: new DeletionMarker(deletedText, isActive),
    side: 1,
  });
