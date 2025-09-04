import * as Automerge from "@automerge/automerge";
import { DocHandle } from "@automerge/automerge-repo";
import { lookup } from "../../../lib/lookup";
import { FieldType, FieldValue } from "./fields";

export abstract class Ref<
  R extends { Value?: unknown; Fields?: symbol; Doc?: unknown } = {
    Value: unknown;
    Fields: symbol;
    Doc: unknown;
  }
> {
  #fields = new Map<symbol, any>();

  protected readonly docHandle: DocHandle<R["Doc"]>;
  readonly path: Automerge.Prop[];
  abstract readonly value: R["Value"];

  constructor(docHandle: DocHandle<R["Doc"]>, path: Automerge.Prop[]) {
    this.docHandle = docHandle;
    this.path = path;
  }

  get docRef(): Ref<{ Doc: R["Doc"]; Value: R["Doc"] }> {
    return new PathRef(this.docHandle, []) as Ref<{
      Doc: R["Doc"];
      Value: R["Doc"];
    }>;
  }

  abstract toId(): string;

  abstract clone(): Ref<R>;

  abstract change(fn: (obj: R["Value"]) => void): void;

  protected abstract resolve(doc: R["Doc"]): R["Value"] | undefined;

  valueAt(heads: Automerge.Heads) {
    return this.resolve(Automerge.view(this.docHandle.doc(), heads));
  }

  with<Type extends symbol, Value>(field: FieldValue<Type, Value>) {
    const clone = this.clone();
    clone.#fields = new Map(this.#fields);
    clone.#fields.set(field.type, field.value);
    return clone as unknown as Ref<{
      Value: R["Value"];
      Fields: R["Fields"] | Type;
    }>;
  }

  withFields(fields: Map<symbol, any>): Ref<R> {
    const clone = this.clone();
    clone.#fields = new Map(fields);
    return clone;
  }

  get<Type extends symbol, Value>(
    field: FieldType<Type, Value>
  ): Type extends R["Fields"] ? Value : Value | undefined {
    return this.#fields.get(field.type);
  }

  has<Type extends symbol, Value>(field: FieldType<Type, Value>) {
    return this.#fields.has(field.type) as Type extends R["Fields"]
      ? true
      : boolean;
  }

  // should be only used by context
  get fields(): [symbol, any][] {
    return Array.from(this.#fields.entries());
  }

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

  // todo: this is not right, the method should only be available if the value is a string
  slice(from: number, to: number) {
    return new TextSpanRef(this.docHandle, this.path, from, to);
  }

  isEqual(other: Ref): boolean {
    return this.toId() === other.toId();
  }
}

export type RefWith<Type extends symbol> = Ref<{ Fields: Type }>;

export class PathRef<
  T extends { Value?: unknown; Doc?: unknown; Fields?: symbol } = {
    Value: unknown;
    Doc: unknown;
    Fields: symbol;
  }
> extends Ref<T> {
  readonly value: T["Value"];

  constructor(docHandle: DocHandle<T["Doc"]>, path: Automerge.Prop[]) {
    super(docHandle, path);

    const value = this.resolve(docHandle.doc());
    if (value === undefined) {
      throw new Error(
        `Failed to create PathRef no value at path ${JSON.stringify(path)}`
      );
    }
    this.value = value;
  }

  protected resolve(doc: Automerge.Doc<T["Doc"]>): T["Value"] | undefined {
    return lookup(doc, this.path);
  }

  clone(): Ref<T> {
    return new PathRef(this.docHandle, this.path);
  }

  toId(): string {
    const url = this.docHandle.url;
    const path = JSON.stringify(this.path);
    return `${url}|${path}`;
  }

  change(fn: (obj: T["Value"]) => void): void {
    this.docHandle.change((doc) => {
      const obj = lookup(doc, this.path);
      fn(obj);
    });
  }
}

export class IdRef<
  T extends { Value?: unknown; Doc?: unknown; Fields?: symbol } = {
    Value: unknown;
    Doc: unknown;
    Fields: never;
  }
> extends Ref<T> {
  private readonly id: any;
  private readonly key: Automerge.Prop;
  readonly value: T["Value"];

  constructor(
    docHandle: DocHandle<T["Doc"]>,
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

  protected resolve(doc: Automerge.Doc<T["Doc"]>): T["Value"] | undefined {
    const objects = lookup(doc, this.path);
    if (!objects) {
      return undefined;
    }
    return objects.find((obj: any) => obj[this.key] === this.id);
  }

  clone(): Ref<T> {
    return new IdRef(this.docHandle, this.path, this.id, this.key);
  }

  toId(): string {
    const url = this.docHandle.url;
    const path = JSON.stringify(this.path);
    const id = this.id;
    return `${url}|${path}|${id}`;
  }

  change(fn: (obj: T["Value"]) => void): void {
    this.docHandle.change((doc) => {
      const obj = lookup(doc, this.path);
      fn(obj);
    });
  }
}

export class TextSpanRef<
  T extends { Value?: string; Doc?: unknown; Fields?: symbol } = {
    Value: string;
    Doc: unknown;
    Fields: never;
  }
> extends Ref<T> {
  private readonly fromCursor: Automerge.Cursor;
  private readonly toCursor: Automerge.Cursor;
  readonly from: number;
  readonly to: number;
  readonly value: T["Value"];

  constructor(
    docHandle: DocHandle<T["Doc"]>,
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

  protected resolve(doc: Automerge.Doc<T["Doc"]>): T["Value"] | undefined {
    const from = Automerge.getCursorPosition(doc, this.path, this.fromCursor);
    const to = Automerge.getCursorPosition(doc, this.path, this.toCursor);

    return lookup<string>(doc, this.path)!.slice(from, to);
  }

  clone(): Ref<T> {
    return new TextSpanRef(this.docHandle, this.path, this.from, this.to);
  }

  toId(): string {
    const url = this.docHandle.url;
    const path = JSON.stringify(this.path);
    const fromCursor = this.fromCursor;
    const toCursor = this.toCursor;

    return `${url}|${path}|${fromCursor}|${toCursor}`;
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
  change(fn: (obj: T["Value"]) => void): void {
    throw new Error("not implemented");
  }
}
