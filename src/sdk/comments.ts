// import { AutomergeUrl, DocHandle } from "@automerge/react";
// import { ObjRef } from "./core/objRefs";
// import { useDerivedSharedContext } from "./core/sharedContext";

// type DocWithComments = {
//   comments: Comment[];
// };

// export const useAllComments = (): Annotation<DiffValue>[] => {
//   return useDerivedSharedContext((context) => {
//     return context.getAllObjRefs().flatMap((objRef) => {
//       const diff = context.getField(objRef, Diff);
//       if (!diff) {
//         return [];
//       }
//       return { objRef, field: diff };
//     });
//   });
// };

// export const useGetDiff = (): ((objRef: ObjRef) => DiffValue | undefined) => {
//   const diffAnnotations: Annotation<DiffValue>[] = useAllDiffs();

//   return useCallback(
//     (objRef: ObjRef) =>
//       diffAnnotations.find((annotation) => annotation.objRef.isEqual(objRef))
//         ?.field,
//     [diffAnnotations]
//   );
// };

// export const useGetDiffsAt = (): ((
//   objRef?: ObjRef
// ) => Annotation<DiffValue>[]) => {
//   const diffAnnotations: Annotation<DiffValue>[] = useAllDiffs();

//   return useCallback(
//     (objRef?: ObjRef) => {
//       if (!objRef) {
//         return [];
//       }

//       return diffAnnotations.filter(
//         (annotation) =>
//           annotation.objRef.isPartOf(objRef) &&
//           !annotation.objRef.isEqual(objRef)
//       );
//     },
//     [diffAnnotations]
//   );
// };
