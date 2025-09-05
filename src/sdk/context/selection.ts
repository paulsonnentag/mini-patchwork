import { useCallback } from "react";
import { defineField } from "./core/fields";
import { useSharedContextComputation, useSubContext } from "./core/hooks";
import { Ref } from "./core/refs";

const IsSelectedSymbol = Symbol("IsSelected");
type IsSelected = typeof IsSelectedSymbol;
const IsSelected = defineField<IsSelected, boolean>(
  "IsSelected",
  IsSelectedSymbol
);

export const useSelection = () => {
  const selectionContext = useSubContext();

  const selectedObjRefs = useSharedContextComputation((context) =>
    context.refsWith(IsSelected)
  );

  const setSelection = useCallback(
    (refs: Ref[]) => {
      selectionContext.replace(refs.map((ref) => ref.with(IsSelected(true))));
    },
    [selectionContext]
  );

  const isSelected = useCallback(
    (objRef: Ref) =>
      selectedObjRefs.some((selectedObjRef) =>
        selectedObjRef.doesOverlap(objRef)
      ),
    [selectedObjRefs]
  );

  return { isSelected, setSelection, selectedObjRefs };
};
