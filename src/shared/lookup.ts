import * as Automerge from "@automerge/automerge";

export const lookup = (doc: any, path: Automerge.Prop[]) => {
  let current = doc;
  for (const key of path) {
    current = current[key];
  }
  return current;
};
