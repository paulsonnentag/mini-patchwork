import * as Automerge from "@automerge/automerge";
import { DocHandle } from "@automerge/react";
import { lookup } from "../../shared/lookup";

export abstract class ObjRef<Obj = any, Doc = any> {
  constructor(protected docHandle: DocHandle<Doc>) {}

  get doc(): ObjRef<Doc, Doc> {
    return new PathRef(this.docHandle, []);
  }

  abstract get value(): Obj;

  abstract toKey(): string;

  doesOverlap(other: ObjRef) {
    return this.toKey() === other.toKey();
  }
}

export class PathRef<Obj = any, Doc = any> extends ObjRef<Obj, Doc> {
  #path: Automerge.Prop[];

  constructor(docHandle: DocHandle<Doc>, path: Automerge.Prop[]) {
    super(docHandle);
    this.#path = path;
  }

  get value(): Obj {
    return lookup(this.docHandle.doc(), this.#path);
  }

  toKey(): string {
    const url = this.docHandle.url;
    const path = JSON.stringify(this.#path);
    return `${url}|${path}`;
  }
}

export class TextSpanRef<Doc = any> extends ObjRef<string, Doc> {
  #path: Automerge.Prop[];
  #fromCursor: Automerge.Cursor;
  #toCursor: Automerge.Cursor;

  constructor(
    docHandle: DocHandle<Doc>,
    path: Automerge.Prop[],
    from: number,
    to: number
  ) {
    super(docHandle);
    this.#path = path;
    const doc = this.docHandle.doc();
    this.#fromCursor = Automerge.getCursor(doc as any, path, from);
    this.#toCursor = Automerge.getCursor(doc as any, path, to);
  }

  get from(): number {
    const doc = this.docHandle.doc();
    return Automerge.getCursorPosition(doc, this.#path, this.#fromCursor);
  }

  get to(): number {
    const doc = this.docHandle.doc();
    return Automerge.getCursorPosition(doc, this.#path, this.#toCursor);
  }

  get value(): string {
    const text = lookup(this.docHandle.doc(), this.#path);
    return text.slice(this.from, this.to);
  }

  toKey(): string {
    const url = this.docHandle.url;
    const path = JSON.stringify(this.#path);
    const fromCursor = this.#fromCursor;
    const toCursor = this.#toCursor;

    return `${url}|${path}|${fromCursor}|${toCursor}`;
  }

  doesOverlap(other: ObjRef): boolean {
    if (
      !(other instanceof TextSpanRef) ||
      this.docHandle !== other.docHandle ||
      this.#path.length !== other.#path.length
    ) {
      return false;
    }
    for (let i = 0; i < this.#path.length; i++) {
      if (this.#path[i] !== other.#path[i]) return false;
    }

    const aStart = Math.min(this.from, this.to);
    const aEnd = Math.max(this.from, this.to);
    const bStart = Math.min(other.from, other.to);
    const bEnd = Math.max(other.from, other.to);

    return aEnd > bStart && bEnd > aStart;
  }
}
