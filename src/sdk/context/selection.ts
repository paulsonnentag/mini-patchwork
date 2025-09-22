import { useCallback } from "react";
import { defineField } from "./core/fields";
import {
  useSharedContext,
  useSharedContextComputation,
  useSubContext,
} from "./core/hooks";
import { Ref } from "./core/refs";

const IsSelectedSymbol = Symbol("IsSelected");
type IsSelected = typeof IsSelectedSymbol;
const IsSelected = defineField<IsSelected, boolean>(
  "IsSelected",
  IsSelectedSymbol
);

export const useSelection = () => {
  const selectionContext = useSubContext();

  const selectedRefs = useSharedContextComputation((context) =>
    context.refsWith(IsSelected)
  );

  const setSelection = useCallback(
    (refs: Ref[]) => {
      selectionContext.replace(refs.map((ref) => ref.with(IsSelected(true))));
    },
    [selectionContext]
  );

  const isSelected = useCallback(
    (ref: Ref) =>
      selectedRefs.some((selectedRef) => selectedRef.doesOverlap(ref)),
    [selectedRefs]
  );

  return { isSelected, setSelection, selectedObjRefs: selectedRefs };
};
