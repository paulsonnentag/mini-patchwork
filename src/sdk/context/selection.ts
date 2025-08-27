import { useCallback, useEffect, useMemo, useState } from "react";
import { defineField } from "./core/fields";
import {
  useDerivedSharedContext,
  useSharedContext,
} from "./core/sharedContext";
import { ObjRef } from "./core/objRefs";

const IsSelected = defineField<boolean>("IsSelected");

export const useSelection = () => {
  const context = useSharedContext();
  const selectedObjRefs = useDerivedSharedContext((context) =>
    context
      .getAllObjRefs()
      .filter((objRef) => context.getField(objRef, IsSelected) === true)
  );

  const setSelection = useMemo(() => {
    let retract = () => {};

    return (objRefs: ObjRef[]) => {
      retract();
      retract = context.change((context) => {
        for (const objRef of objRefs) {
          context.add(objRef).with(IsSelected(true));
        }
      });
    };
  }, [context]);

  const isSelected = useCallback(
    (objRef: ObjRef) =>
      selectedObjRefs.some((selectedObjRef) =>
        selectedObjRef.doesOverlap(objRef)
      ),
    [selectedObjRefs]
  );

  return { isSelected, setSelection };
};
