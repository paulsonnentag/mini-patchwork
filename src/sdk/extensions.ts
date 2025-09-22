// import { useCallback } from "react";
// import { defineField } from "./core/fields";
// import { useSharedContextComputation } from "./core/hooks";
// import { Ref, RefWith } from "./core/refs";

// export type ExtensionValue = {
//   slot: string;
//   value: string;
// };

// const ExtensionSymbol = Symbol("Extension");
// export type Extension = typeof ExtensionSymbol;
// export const Extension = defineField<Extension, ExtensionValue>(
//   "extension",
//   ExtensionSymbol
// );

// export const useRefsWithExtensionsAt = (ref?: Ref): RefWith<Extension>[] =>
//   useSharedContextComputation((context) => {
//     if (!ref) {
//       return [];
//     }

//     return context
//       .refsWith(Extension)
//       .flatMap((ref) => (ref.isPartOf(ref) && !ref.isEqual(ref) ? ref : []));
//   });

// export const refsWithExtensionsAt = (ref?: Ref): RefWith<Extension>[] => {
//   if (!ref) {
//     return [];
//   }

//   return context
//     .refsWith(Extension)
//     .flatMap((ref) => (ref.isPartOf(ref) && !ref.isEqual(ref) ? ref : []));
// };
