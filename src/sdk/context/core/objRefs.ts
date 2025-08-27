import * as Automerge from "@automerge/automerge";
import { DocHandle } from "@automerge/automerge-repo";
import { lookup } from "../../../shared/lookup";

export abstract class ObjRef<Obj = unknown, Doc = unknown> {
  protected readonly docHandle: DocHandle<Doc>;
  readonly path: Automerge.Prop[];
  abstract readonly value: Obj;

  constructor(docHandle: DocHandle<Doc>, path: Automerge.Prop[]) {
    this.docHandle = docHandle;
    this.path = path;
  }

  get doc(): ObjRef<Doc, Doc> {
    return new PathRef(this.docHandle, []);
  }

  abstract toKey(): string;

  abstract change(fn: (obj: Obj) => void): void;

  protected abstract resolve(doc: Doc): Obj | undefined;

  valueAt(heads: Automerge.Heads) {
    return this.resolve(Automerge.view(this.docHandle.doc(), heads));
  }

  doesOverlap(other: ObjRef) {
    return this.toKey() === other.toKey();
  }

  isPartOf(other: ObjRef) {
    if (
      other.docHandle !== this.docHandle ||
      other.path.length > this.path.length
    ) {
      return false;
    }

    for (let i = 0; i < other.path.length; i++) {
      if (this.path[i] !== other.path[i]) {
        return false;
      }
    }

    return true;
  }

  isEqual(other: ObjRef) {
    return this.toKey() === other.toKey();
  }
}

export class PathRef<Obj = unknown, Doc = unknown> extends ObjRef<Obj, Doc> {
  readonly value: Obj;

  constructor(docHandle: DocHandle<Doc>, path: Automerge.Prop[]) {
    super(docHandle, path);

    const value = this.resolve(docHandle.doc());
    if (value === undefined) {
      throw new Error(
        `Failed to create PathRef no value at path ${JSON.stringify(path)}`
      );
    }
    this.value = value;
  }

  protected resolve(doc: Automerge.Doc<Doc>): Obj | undefined {
    return lookup(doc, this.path);
  }

  toKey(): string {
    const url = this.docHandle.url;
    const path = JSON.stringify(this.path);
    return `${url}|${path}`;
  }

  change(fn: (obj: Obj) => void): void {
    this.docHandle.change((doc) => {
      const obj = lookup(doc, this.path);
      fn(obj);
    });
  }
}

export class IdRef<
  Obj = unknown,
  Doc extends Automerge.Doc<unknown> = Automerge.Doc<unknown>,
  Id = unknown
> extends ObjRef<Obj, Doc> {
  private readonly id: Id;
  private readonly key: Automerge.Prop;
  readonly value: Obj;

  constructor(
    docHandle: DocHandle<Doc>,
    path: Automerge.Prop[],
    id: any,
    key: Automerge.Prop
  ) {
    super(docHandle, path);
    this.id = id;
    this.key = key;

    const value = this.resolve(docHandle.doc());
    if (value === undefined) {
      throw new Error(
        `Failed to create IdRef no object with id ${
          this.id
        } found at path ${JSON.stringify(path)}`
      );
    }
    this.value = value;
  }

  protected resolve(doc: Doc): Obj | undefined {
    const objects = lookup(doc, this.path);
    if (!objects) {
      return undefined;
    }
    return objects.find((obj: any) => obj[this.key] === this.id);
  }

  toKey(): string {
    const url = this.docHandle.url;
    const path = JSON.stringify(this.path);
    const id = this.id;
    return `${url}|${path}|${id}`;
  }

  change(fn: (obj: Obj) => void): void {
    this.docHandle.change((doc) => {
      const obj = lookup(doc, this.path);
      fn(obj);
    });
  }
}

export class TextSpanRef<
  Doc extends Automerge.Doc<unknown> = Automerge.Doc<unknown>
> extends ObjRef<string, Doc> {
  private readonly fromCursor: Automerge.Cursor;
  private readonly toCursor: Automerge.Cursor;
  readonly from: number;
  readonly to: number;
  readonly value: string;

  constructor(
    docHandle: DocHandle<Doc>,
    path: Automerge.Prop[],
    from: number,
    to: number
  ) {
    super(docHandle, path);

    const doc = this.docHandle.doc();
    this.fromCursor = Automerge.getCursor(doc, path, from);
    this.toCursor = Automerge.getCursor(doc, path, to);
    this.from = from;
    this.to = to;

    const value = this.resolve(doc);
    if (value === undefined) {
      throw new Error(
        `Failed to create TextSpanRef no value at path ${JSON.stringify(path)}`
      );
    }
    this.value = value;
  }

  protected resolve(doc: Doc): string | undefined {
    const from = Automerge.getCursorPosition(doc, this.path, this.fromCursor);
    const to = Automerge.getCursorPosition(doc, this.path, this.toCursor);

    return lookup<string>(doc, this.path)!.slice(from, to);
  }

  toKey(): string {
    const url = this.docHandle.url;
    const path = JSON.stringify(this.path);
    const fromCursor = this.fromCursor;
    const toCursor = this.toCursor;

    return `${url}|${path}|${fromCursor}|${toCursor}`;
  }

  doesOverlap(other: ObjRef): boolean {
    if (
      !(other instanceof TextSpanRef) ||
      this.docHandle !== other.docHandle ||
      this.path.length !== other.path.length
    ) {
      return false;
    }
    for (let i = 0; i < this.path.length; i++) {
      if (this.path[i] !== other.path[i]) return false;
    }

    const aStart = Math.min(this.from, this.to);
    const aEnd = Math.max(this.from, this.to);
    const bStart = Math.min(other.from, other.to);
    const bEnd = Math.max(other.from, other.to);

    return aEnd > bStart && bEnd > aStart;
  }

  change(fn: (obj: string) => void): void {
    throw new Error("not implemented");
  }
}
