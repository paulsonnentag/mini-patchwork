import * as Automerge from "@automerge/automerge";
import { DocHandle } from "@automerge/automerge-repo";
import { lookup } from "../../../lib/lookup";
import { FieldType, FieldValue } from "./fields";

export abstract class Ref<Value = unknown, Doc = unknown> {
  protected readonly docHandle: DocHandle<Doc>;
  readonly path: Automerge.Prop[];

  constructor(docHandle: DocHandle<Doc>, path: Automerge.Prop[]) {
    this.docHandle = docHandle;
    this.path = path;
  }

  // ==== value methods ====

  get value() {
    return this.resolve(this.docHandle.doc());
  }

  valueAt(heads: Automerge.Heads) {
    return this.resolve(Automerge.view(this.docHandle.doc(), heads));
  }

  // todo: this is not right
  // the method should only be available if the value is a string
  slice(from: number, to: number) {
    return new TextSpanRef(this.docHandle, this.path, from, to);
  }

  get docRef(): Ref<Doc, Doc> {
    return new PathRef(this.docHandle, []) as Ref<Doc, Doc>;
  }

  // ==== mutation methods ====

  change(fn: (obj: Value) => void) {
    this.docHandle.change((doc) => {
      const obj = this.resolve(doc);

      if (obj) {
        fn(obj);
      }
    });
  }

  // ==== ref arithmetic methods ====

  doesOverlap(other: Ref) {
    return this.toId() === other.toId();
  }

  isPartOf(other: Ref) {
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

  // ==== field methods ====

  with<Type extends symbol, Value>(field: FieldValue<Type, Value>) {
    return new RefWithFields(this).with(field) as RefWithFields<Type, Ref>;
  }

  // should only be used by context
  withFields<Fields extends symbol = never>(
    fields: Map<symbol, any>
  ): RefWithFields<Fields, Ref<Value, Doc>> {
    return new RefWithFields(this, fields) as RefWithFields<
      Fields,
      Ref<Value, Doc>
    >;
  }

  // ==== methods to implement in subclasses ====

  abstract toId(): string;

  protected abstract resolve(doc: Doc): Value | undefined;
}

export class RefWithFields<Fields extends symbol = never, R extends Ref = Ref> {
  #fields: Map<symbol, any>;

  constructor(readonly ref: R, fields?: Map<symbol, any>) {
    this.#fields = fields ?? new Map();
  }

  get<Type extends symbol, Value>(
    field: FieldType<Type, Value>
  ): Type extends Fields ? Value : Value | undefined {
    return this.#fields.get(field.type) as Value;
  }

  has<Type extends symbol, Value>(field: FieldType<Type, Value>) {
    return this.#fields.has(field.type) as Type extends Fields ? true : boolean;
  }

  with<Type extends symbol, Value>(field: FieldValue<Type, Value>) {
    const fields = new Map(this.#fields);

    fields.set(field.type, field.value);

    return new RefWithFields(this.ref, fields) as RefWithFields<
      Fields | Type,
      R
    >;
  }

  // should be only used by context
  get fields(): [symbol, any][] {
    return Array.from(this.#fields.entries());
  }
}

export class PathRef<Value = unknown, Doc = unknown> extends Ref<Value, Doc> {
  constructor(docHandle: DocHandle<Doc>, path: Automerge.Prop[]) {
    super(docHandle, path);

    return addToCachOrGetCachedRef(this);
  }

  protected resolve(doc: Automerge.Doc<Doc>): Value | undefined {
    return lookup(doc, this.path);
  }

  toId(): string {
    const url = this.docHandle.url;
    const path = JSON.stringify(this.path);
    return `${url}:${path}`;
  }
}

export class IdRef<Value = unknown, Doc = unknown> extends Ref<Value, Doc> {
  #id: any;
  #key: Automerge.Prop;

  constructor(
    docHandle: DocHandle<Doc>,
    path: Automerge.Prop[],
    id: any,
    key: Automerge.Prop
  ) {
    super(docHandle, path);
    this.#id = id;
    this.#key = key;

    return addToCachOrGetCachedRef(this);
  }

  protected resolve(doc: Automerge.Doc<Doc>): Value | undefined {
    const objects = lookup(doc, this.path);
    if (!objects) {
      return undefined;
    }
    return objects.find((obj: any) => obj[this.#key] === this.#id);
  }

  toId(): string {
    return this.#id;
  }
}

export class TextSpanRef<Doc = unknown> extends Ref<string, Doc> {
  #fromCursor: Automerge.Cursor;
  #toCursor: Automerge.Cursor;

  constructor(
    docHandle: DocHandle<Doc>,
    path: Automerge.Prop[],
    from: number,
    to: number
  ) {
    super(docHandle, path);

    const doc = this.docHandle.doc();
    this.#fromCursor = Automerge.getCursor(doc, path, from);
    this.#toCursor = Automerge.getCursor(doc, path, to);

    return addToCachOrGetCachedRef(this);
  }

  get from() {
    return Automerge.getCursorPosition(
      this.docHandle.doc(),
      this.path,
      this.#fromCursor
    );
  }

  get to() {
    return Automerge.getCursorPosition(
      this.docHandle.doc(),
      this.path,
      this.#toCursor
    );
  }

  protected resolve(doc: Automerge.Doc<Doc>): string | undefined {
    const from = Automerge.getCursorPosition(doc, this.path, this.#fromCursor);
    const to = Automerge.getCursorPosition(doc, this.path, this.#toCursor);

    return lookup<string>(doc, this.path)!.slice(from, to);
  }

  toId(): string {
    return `${this.#fromCursor}:${this.#toCursor}`;
  }

  doesOverlap(other: Ref): boolean {
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

  slice(from: number, to: number) {
    return new TextSpanRef(
      this.docHandle,
      this.path,
      this.from + from,
      this.from + to
    );
  }

  // todo: figure out what to do here
  // we could implement a mutable string here but that feels bad
  change(fn: (obj: string) => void): void {
    throw new Error("not implemented");
  }
}

// REF CACHING

// we can't use a weak map because we need to index by string
// weak maps hold a weak reference to the key not the value

const REFS_BY_ID = new Map<string, Ref>();

// in order to avoid memory leaks we use a finalization registry
// the callback is called when the ref is garbage collected
const refRegistry = new FinalizationRegistry((id: string) => {
  REFS_BY_ID.delete(id);
});

// todo: Ideally we would handle the caching logic in the constructor of Ref
// unfortunately it's not possible from the parent constructor to affect
// what value is returned in the child class.
// As a workaround we have this helper function that each sub class of Ref should call and return it's result
const addToCachOrGetCachedRef = <T extends Ref>(ref: T): T => {
  const cachedRef = REFS_BY_ID.get(ref.toId());

  if (cachedRef) {
    return cachedRef as T;
  }

  REFS_BY_ID.set(ref.toId(), ref);
  refRegistry.register(ref, ref.toId());
  return ref;
};
