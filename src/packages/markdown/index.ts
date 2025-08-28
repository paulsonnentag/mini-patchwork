import { DataTypeTemplate, Tool } from "../../sdk/types";
import { DataType } from "../../sdk/types";
import { MarkdownDoc, MarkdownEditor } from "./MarkdownEditor";

export const MarkdownDataType: DataType<MarkdownDoc> = {
  id: "markdown",
  name: "Markdown",
  getTitle(doc: MarkdownDoc) {
    const content = doc.content;
    const frontmatterRegex = /---\n([\s\S]+?)\n---/;
    const frontmatterMatch = content.match(frontmatterRegex);
    const frontmatter = frontmatterMatch ? frontmatterMatch[1] : "";

    const titleRegex = /title:\s"(.+?)"/;
    const subtitleRegex = /subtitle:\s"(.+?)"/;

    const titleMatch = frontmatter.match(titleRegex);
    const subtitleMatch = frontmatter.match(subtitleRegex);

    let title = titleMatch ? titleMatch[1] : null;
    const subtitle = subtitleMatch ? subtitleMatch[1] : "";

    // If title not found in frontmatter, find first markdown heading
    if (!title) {
      const titleFallbackRegex = /(^|\n)#\s(.+)/;
      const titleFallbackMatch = content.match(titleFallbackRegex);
      title = titleFallbackMatch ? titleFallbackMatch[2] : "Untitled";
    }

    return `${title}${subtitle && `: ${subtitle}`}`;
  },
};

export const MarkdownTemplate: DataTypeTemplate<MarkdownDoc> = {
  dataType: "markdown",
  name: "Markdown",
  init: (doc: MarkdownDoc) => {
    doc.content = "# Untitled";
  },
};

export const MarkdownTool: Tool = {
  id: "markdown",
  name: "Markdown",
  supportsDocument: (doc) => doc["@patchwork"].type === "markdown",
  editor: MarkdownEditor,
};
