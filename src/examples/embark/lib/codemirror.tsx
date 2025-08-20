import { RangeSet } from "@codemirror/state";
import { DecorationSet } from "@codemirror/view";

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
  throw new Error("not implemented");
};
