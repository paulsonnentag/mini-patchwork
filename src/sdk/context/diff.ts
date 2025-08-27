import * as Automerge from "@automerge/automerge";
import { DocHandle } from "@automerge/automerge-repo";
import { useCallback, useEffect } from "react";
import { lookup } from "../../shared/lookup";
import { defineField } from "./core/fields";
import { ObjRef, PathRef } from "./core/objRefs";
import {
  useDerivedSharedContext,
  useSharedContext,
} from "./core/sharedContext";

type AddedDiff = {
  type: "added";
};

type ChangedDiff<T> = {
  type: "changed";
  before: T;
};

type DeletedDiff<T> = {
  type: "deleted";
  before: T;
};

type DiffValue<T = unknown> = AddedDiff | ChangedDiff<T> | DeletedDiff<T>;

const Diff = defineField<DiffValue>("diff");

export const useAddDiffOfDoc = (
  docHandle: DocHandle<unknown>,
  headsBefore?: Automerge.Heads
) => {
  const context = useSharedContext();

  useEffect(() => {
    if (!headsBefore) {
      return;
    }

    let retract = () => {};

    const onChange = () => {
      const patches = Automerge.diff(
        docHandle.doc(),
        headsBefore,
        Automerge.getHeads(docHandle.doc())
      );
      const docBefore = Automerge.view(docHandle.doc(), headsBefore);

      retract();

      retract = context.change((tx) => {
        // Track which ancestor paths we've marked as modified during this pass
        const modifiedPaths = new Set<string>();

        for (const patch of patches) {
          // First, ensure ancestors are marked as modified incrementally.
          // We assume patches are ordered from higher-level to lower-level paths.
          // Add modified for all ancestors above the leaf (exclude root and the leaf itself).
          for (let i = patch.path.length; i > 0; i--) {
            const ancestorPath = patch.path.slice(0, i);
            const key = JSON.stringify(ancestorPath);
            if (modifiedPaths.has(key)) break;

            const ancestorRef = new PathRef(docHandle, ancestorPath);
            const before = lookup(docBefore, ancestorPath);

            if (before) {
              tx.add(ancestorRef).with(Diff({ type: "changed", before }));
            } else {
              tx.add(ancestorRef).with(Diff({ type: "added" }));
            }

            modifiedPaths.add(key);
          }

          // Then add leaf annotations for the specific patch
          const objRef = new PathRef(docHandle, patch.path);

          switch (patch.action) {
            case "put":
              tx.add(objRef).with(Diff({ type: "added" }));
              break;
            case "del": {
              const before = lookup(docBefore, patch.path);
              tx.add(objRef).with(Diff({ type: "deleted", before }));
              break;
            }
            case "insert": {
              tx.add(objRef).with(Diff({ type: "added" }));
              break;
            }
          }
        }
      });
    };

    onChange();

    docHandle.on("change", onChange);

    return () => {
      retract();
      docHandle.off("change", onChange);
    };
  }, [context, docHandle, headsBefore]);
};

// are annotations a good idea?
type Annotation<T> = {
  objRef: ObjRef;
  field: T;
};

export const useAllDiffs = (): Annotation<DiffValue>[] => {
  return useDerivedSharedContext((context) => {
    return context.getAllObjRefs().flatMap((objRef) => {
      const diff = context.getField(objRef, Diff);
      if (!diff) {
        return [];
      }
      return { objRef, field: diff };
    });
  });
};

export const useGetDiff = (): ((objRef: ObjRef) => DiffValue | undefined) => {
  const diffAnnotations: Annotation<DiffValue>[] = useAllDiffs();

  return useCallback(
    (objRef: ObjRef) =>
      diffAnnotations.find((annotation) => annotation.objRef.isEqual(objRef))
        ?.field,
    [diffAnnotations]
  );
};
