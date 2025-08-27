import * as Automerge from "@automerge/automerge";
import { DocHandle } from "@automerge/automerge-repo";
import { useCallback, useEffect } from "react";
import { lookup } from "../../lib/lookup";
import { defineField } from "./core/fields";
import { ObjRef, PathRef, TextSpanRef } from "./core/objRefs";
import {
  useDerivedSharedContext,
  useSharedContext,
} from "./core/sharedContext";
import { last } from "../../lib/last";

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

  console.log("add diff", docHandle.url, headsBefore);

  useEffect(() => {
    if (!headsBefore) {
      return;
    }

    let retract = () => {};

    const onChange = () => {
      const docBefore = Automerge.view(docHandle.doc(), headsBefore);
      const docAfter = docHandle.doc();

      const patches = Automerge.diff(
        docAfter,
        headsBefore,
        Automerge.getHeads(docAfter)
      );

      console.log("patches", patches);

      retract();
      retract = context.change((tx) => {
        // Track which ancestor paths we've marked as modified during this pass
        const modifiedPaths = new Set<string>();

        for (const patch of patches) {
          const ancestorPath =
            typeof last(patch.path) === "number"
              ? patch.path.slice(0, -1)
              : patch.path;

          // First, ensure ancestors are marked as modified incrementally.
          // We assume patches are ordered from higher-level to lower-level paths.
          // Add modified for all ancestors above the leaf (exclude root and the leaf itself).
          for (let i = ancestorPath.length; i > 0; i--) {
            const ancestorSubPath = ancestorPath.slice(0, i);
            const key = JSON.stringify(ancestorSubPath);
            if (modifiedPaths.has(key)) break;

            const ancestorRef = new PathRef(docHandle, ancestorSubPath);
            const before = lookup(docBefore, ancestorSubPath);

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
              // is this a span deletion?
              if (patch.length !== undefined) {
                const parentPath = patch.path.slice(0, -1);
                const parent = lookup(docBefore, parentPath);

                // for text mark the span as deleted
                if (typeof parent === "string") {
                  const from = last(patch.path) as number;
                  const to = from + patch.length;
                  const before = parent.slice(from, to);

                  const textSpan = new TextSpanRef(
                    docHandle,
                    parentPath,
                    from,
                    to
                  );

                  tx.add(textSpan).with(Diff({ type: "deleted", before }));

                  // for arrays mark the indiviual objects in the range as deleted
                } else if (Array.isArray(parent)) {
                  throw new Error("not implemented");
                } else {
                  throw new Error("Unexpected value, this should never happen");
                }

                // ... otherwise this is a deletion of a key in an object
              } else {
                const before = lookup(docBefore, patch.path);
                tx.add(objRef).with(Diff({ type: "deleted", before }));
              }
              break;
            }

            case "insert": {
              tx.add(objRef).with(Diff({ type: "added" }));
              break;
            }

            case "splice": {
              const parentPath = patch.path.slice(0, -1);
              const from = last(patch.path) as number;
              const to = from + patch.value.length;
              const textSpan = new TextSpanRef(docHandle, parentPath, from, to);

              tx.add(textSpan).with(Diff({ type: "added" }));
            }
          }
        }
      });
    };

    console.log("run effect");

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

export const useGetDiffsAt = (): ((
  objRef: ObjRef
) => Annotation<DiffValue>[]) => {
  const diffAnnotations: Annotation<DiffValue>[] = useAllDiffs();

  return useCallback(
    (objRef: ObjRef) =>
      diffAnnotations.filter(
        (annotation) =>
          annotation.objRef.isPartOf(objRef) &&
          !annotation.objRef.isEqual(objRef)
      ),
    [diffAnnotations]
  );
};
