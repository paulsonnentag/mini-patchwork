import * as Automerge from "@automerge/automerge";
import { DocHandle } from "@automerge/react";

class Field<T = unknown> {
  constructor(readonly value: T, readonly type: Function) {}

  isA(type: Function): boolean {
    return type === this.type;
  }
}

type FieldType<T> = {
  (value: T): Field<T>;
};

export const defineField = <T>(): FieldType<T> => {
  const constructor: FieldType<T> = (value: T) => {
    return new Field(value, constructor);
  };

  return constructor;
};

export class ObjRef<V = unknown, D = unknown> {
  get doc(): ObjRef<D> {
    throw new Error("not implemented");
  }

  add(field: Field) {
    // todo: add field to obj ref
  }

  get<V>(field: FieldType<V>): V {
    throw new Error("not implemented");
  }

  get value(): V {
    throw new Error("not implemented");
  }
}

export class ValueRef<T> extends ObjRef<T> {
  constructor(
    readonly context: Context,
    readonly docHandle: DocHandle<string>,
    readonly path: Automerge.Prop[]
  ) {
    super();
  }
}

export class IdRef<T> extends ObjRef<T> {
  constructor(
    readonly context: Context,
    readonly docHandle: DocHandle<string>,
    readonly path: Automerge.Prop[],
    readonly key: Automerge.Prop
  ) {
    super();
  }
}

export class TextRef<T> extends ObjRef<T> {
  constructor(
    readonly docHandle: DocHandle<string>,
    readonly path: Automerge.Prop[]
  ) {
    super();
  }

  slice(from: number, to: number): TextSpanRef {
    throw new Error("not implemented");
  }
}

export class TextSpanRef extends ObjRef<string> {
  constructor(
    readonly docHandle: DocHandle<unknown>,
    readonly path: Automerge.Prop[],
    readonly fromCursor: Automerge.Cursor,
    readonly toCursor: Automerge.Cursor
  ) {
    super();
  }

  get from(): number {
    throw new Error("not implemented");
  }

  get to(): number {
    throw new Error("not implemented");
  }

  overlaps(obj: ObjRef): boolean {
    throw new Error("not implemented");
  }
}

export class Context {
  objectRefs = new Map<Automerge.ObjID, ObjRef>();
  fields = new Map<Automerge.ObjID, Map<Field, any>>();

  // forEach: <>(type: T, mutate: () => void));
}

export class MutableContext {
  add(value: ObjRef | Field | ObjRef[] | Field[]) {}
}

export const handleToObjRef = <T>(handle: DocHandle<T>): ValueRef<T> => {
  throw new Error("not implemented");
};

export const getPathRef = <T>(
  handle: DocHandle<unknown>,
  path: Automerge.Prop[]
): ValueRef<T> => {
  throw new Error("not implemented");
};

export const getTextSpanRef = <T>(
  handle: DocHandle<unknown>,
  path: Automerge.Prop[],
  from: number,
  to: number
): TextSpanRef => {
  throw new Error("not implemented");
};

// react hooks

export const useSharedContext = (): Context => {
  throw new Error("not implemented");
};

export const useObjects = <T>(fn: (objRef: ObjRef) => boolean): ObjRef<T>[] => {
  throw new Error("not implemented");
};

// selection library

export const useSelection = (): {
  isSelected: (obj: ObjRef) => boolean;
  setSelection: (obj: ObjRef[]) => void;
} => {
  throw new Error("not implemented");
};

// diff

// comments
