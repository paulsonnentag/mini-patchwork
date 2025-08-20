import {
  DocHandle,
  DocumentId,
  Repo,
  useDocHandle,
  useDocument,
  useRepo,
} from "@automerge/react";
import { RangeSet } from "@codemirror/state";
import { Decoration, DecorationSet } from "@codemirror/view";
import { useEffect, useMemo, useState } from "react";
import {
  defineField,
  getTextSpanRef,
  handleToObjRef,
  ObjRef,
  TextSpanRef,
  useSelection,
  useSharedContext,
} from "../../lib/core";
import { ToolProps } from "../../lib/patchwork";
import { Codemirror } from "./lib/codemirror";

type MarkdownDoc = {
  content: string;
};

const Link = defineField<{ target: ObjRef }>();

const parseMarkdownLinks = async (
  repo: Repo,
  handle: DocHandle<MarkdownDoc>
): Promise<TextSpanRef[]> => {
  const textSpans: TextSpanRef[] = [];
  // Single regex to match markdown links with the specific pattern: [text](anything--documentId) or [text](anything--documentId?params)
  const regex = /\[([^\]]*)\]\(([^)]*)--([A-Za-z0-9_-]+)(\?[^)]*)?\)/g;
  const content = handle.doc().content;

  let match;
  while ((match = regex.exec(content)) !== null) {
    const fullMatch = match[0];
    const documentId = match[3];
    const from = match.index;
    const to = match.index + fullMatch.length;

    const textSpan = getTextSpanRef(handle, ["content"], from, to);
    const target = await repo.find(documentId as DocumentId);

    textSpan.add(
      Link({
        target: handleToObjRef(target),
      })
    );
    textSpans.push(textSpan);
  }

  return textSpans;
};

const MarkdownTool = ({ docUrl }: ToolProps) => {
  const repo = useRepo();
  const [doc] = useDocument(docUrl, { suspense: true });
  const handle = useDocHandle<MarkdownDoc>(docUrl, { suspense: true });
  const context = useSharedContext();
  const { isSelected, setSelection } = useSelection();

  // parse links
  const [textSpansWithLink, setTextSpansWithLink] = useState<TextSpanRef[]>([]);
  useEffect(() => {
    let isCanceled = false;

    parseMarkdownLinks(repo, handle).then((links) => {
      if (isCanceled) {
        return;
      }
      setTextSpansWithLink(links);
    });

    return () => {
      isCanceled = true;
    };
  }, [repo, handle, doc]);

  // add links to context
  useEffect(
    () =>
      context.change((context) => {
        context.add(textSpansWithLink);
      }),
    [textSpansWithLink]
  );

  // compute decorations from links
  const decorations = useMemo<DecorationSet>(
    () =>
      RangeSet.of<Decoration>(
        textSpansWithLink.map((textSpan) => {
          const link = textSpan.get(Link);
          const isLinkSelected =
            isSelected(textSpan) || isSelected(link.target);
          const { from, to } = textSpan;

          return Decoration.mark({
            class: isLinkSelected ? "bg-yellow-200" : "bg-yellow-400",
          }).range(from, to);
        }),
        true // sort ranges
      ),
    [textSpansWithLink, isSelected]
  );

  const onChangeSelection = (from: number, to: number) => {
    const selectedText = getTextSpanRef(handle, ["content"], from, to);
    const overlappingLinks = textSpansWithLink.filter((textSpan) =>
      selectedText.overlaps(textSpan)
    );

    const selectedObjects: ObjRef[] = [
      selectedText,
      ...overlappingLinks.map((textSpan) => textSpan.get(Link).target),
    ];

    setSelection(selectedObjects);
  };

  return (
    <Codemirror
      docUrl={docUrl}
      path={["content"]}
      onChangeSelection={onChangeSelection}
      decorations={decorations}
    />
  );
};
