import { useCallback } from "react";
import { defineField } from "./core/fields";
import { useDerivedSharedContext, useTransaction } from "./core/hooks";
import { Ref } from "./core/refs";

const IsSelected = defineField<boolean>("IsSelected");

export const useSelection = () => {
  const transaction = useTransaction();

  const selectedObjRefs = useDerivedSharedContext((context) =>
    context
      .getAllWith(IsSelected)
      .flatMap((annotation) =>
        annotation.get(IsSelected) === true ? annotation.objRef : []
      )
  );

  const setSelection = useCallback(
    (objRefs: Ref[]) => {
      transaction.change((add) => {
        for (const objRef of objRefs) {
          add(objRef.with(IsSelected(true)));
        }
      });
    },
    [transaction]
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
