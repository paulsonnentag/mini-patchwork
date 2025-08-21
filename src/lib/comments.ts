import * as Automerge from "@automerge/automerge";
import { defineField, ObjRef, useSharedContext } from "./core";

type Comment = {
  contactUrl: string;
};

type Comments = {
  comments: Comment[];
};



export const getComments = (<T>(objRef: ObjRef<T>) =>) => {


}


export const addComment = (objRef: ObjRef, comment: Comment) => {

}