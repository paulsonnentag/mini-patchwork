// import { AutomergeUrl, DocHandle } from "@automerge/react";

// type DocWithComments = {
//   comments: Comment[];
// };

// export const addComments = (docHandle: DocHandle<DocWithComments>) => {};

// export const useComments = (): { comments } => {
//   return {
//     comments,
//     addComment,
//     resolveComments,
//   };
// };

// export const useAllComments = () => {};

// class Discussion {
//   comments: Comment[] = [];

//   resolve(): void {}
// }

// export class Comment<D = unknown, T = unknown, V = unknown> {
//   public readonly id: string;
//   public readonly content: string;
//   public readonly timestamp: number;
//   public readonly contactUrl: AutomergeUrl;
//   public readonly isBeingEdited: boolean;

//   constructor(
//     comment: StoredComment,
//     private readonly discussion: Discussion<D, T, V>
//   ) {
//     this.id = comment.id;
//     this.content = comment.content ?? comment.draftContent ?? "";
//     this.timestamp = comment.timestamp;
//     this.contactUrl = comment.contactUrl;
//     this.isBeingEdited = comment.draftContent !== undefined;
//   }

//   change(fn: (comment: StoredComment) => void): void {
//     this.discussion.change((discussion) => {
//       const comment = discussion.comments.find((c) => c.id === this.id);
//       if (comment) {
//         fn(comment);
//       }
//     });
//   }

//   updateContent(content: string): void {
//     this.change((comment) => {
//       if ("draftContent" in comment) {
//         comment.draftContent = content;
//       } else {
//         comment.content = content;
//       }
//     });
//   }

//   edit(): void {
//     this.change((comment) => {
//       if (comment.draftContent === undefined) {
//         comment.draftContent = this.content;
//       }
//     });
//   }

//   submit(): void {
//     this.change((comment) => {
//       comment.content = comment.draftContent;
//       delete comment.draftContent;
//     });
//   }

//   cancel(): void {
//     this.discussion.change((discussion) => {
//       const commentIndex = discussion.comments.findIndex(
//         (c) => c.id === this.id
//       );
//       if (commentIndex == -1) {
//         return;
//       }

//       const comment = discussion.comments[commentIndex];

//       if ("content" in comment) {
//         delete comment.draftContent;
//       } else {
//         discussion.comments.splice(commentIndex, 1);
//       }
//     });
//   }

//   delete(): void {
//     this.discussion.change((discussion) => {
//       const commentIndex = discussion.comments.findIndex(
//         (c) => c.id === this.id
//       );
//       if (commentIndex == -1) {
//         return;
//       }

//       discussion.comments.splice(commentIndex, 1);
//     });
//   }
// }
