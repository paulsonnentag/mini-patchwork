import { useCallback } from "react";
import { defineField } from "./core/fields";
import { useDerivedSharedContext } from "./core/hooks";
import { ObjRef } from "./core/objRefs";

export type ExtensionValue = {
  slot: string;
  value: string;
};

export const Extension = defineField<ExtensionValue>("extension");

type Annotation<T> = {
  objRef: ObjRef;
  field: T;
};

export const useExtensionsAt = (): ((
  objRef?: ObjRef
) => Annotation<ExtensionValue>[]) => {
  const allExtensions: Annotation<ExtensionValue>[] = useDerivedSharedContext(
    (context) => {
      return context.getAll().flatMap((objRef) => {
        const ext = context.getField(objRef, Extension);
        if (!ext) return [];
        return [{ objRef, field: ext }];
      });
    }
  );

  return useCallback(
    (objRef?: ObjRef) => {
      if (!objRef) return [];
      // Only include extensions that are part of the provided object (e.g. the content),
      // but not the object itself, mirroring the diffs API.
      return allExtensions.filter(
        (annotation) =>
          annotation.objRef.isPartOf(objRef) &&
          !annotation.objRef.isEqual(objRef)
      );
    },
    [allExtensions]
  );
};
