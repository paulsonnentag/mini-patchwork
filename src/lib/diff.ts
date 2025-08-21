import * as Automerge from "@automerge/automerge";
import { defineField, ObjRef, useSharedContext } from "./core";

type AddedDiff<T> = {
  type: "added";
  value: T;
};

type ChangedDiff<T> = {
  type: "modified";
  value: T;
};

type DeletedDiff<T> = {
  type: "deleted";
  value: T;
};

type Diff<T> = AddedDiff<T> | ChangedDiff<T> | DeletedDiff<T>;

type DocChanges<T = unknown> = {
  patches: Automerge.Patch[];
  docBefore: Automerge.Doc<T>;
};

const DocChangesField = defineField<DocChanges>();

export const getDiff = (): (<T>(objRef: ObjRef<T>) => Diff<T>[]) => {
  return (objRef: ObjRef) => {
    const docChanges = objRef.doc.get(DocChangesField);

    // todo: figure out if objRef is affected by the doc changes

    throw new Error("not implemented");
  };
};
