import { Field } from "./field";

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

export class Context {
  objectRefs = new Set<ObjRef>();
  fields = new Map<ObjRef, Map<Field, any>>();

  // forEach: <>(type: T, mutate: () => void));
}
