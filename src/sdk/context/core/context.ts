import { deepEqual } from "../../../lib/deepEqual";
import { FieldType } from "./fields";
import { Ref, RefWithFields } from "./refs";

type FieldsByRef = Map<Ref, Map<symbol, any>>;

export class Context {
  #subscribers = new Set<() => void>();
  #fieldsByRef: FieldsByRef = new Map();
  #subcontexts = new Set<Context>();

  // ==== mutation methods ====

  add(ref: Ref | Ref[] | RefWithFields | RefWithFields[]) {
    addTo(this.#fieldsByRef, ref);
    this.#notify();
  }

  replace(ref: Ref | Ref[] | RefWithFields | RefWithFields[]) {
    const newFieldsByRef = new Map<Ref, Map<symbol, any>>();
    addTo(newFieldsByRef, ref);

    if (isEqual(this.#fieldsByRef, newFieldsByRef)) {
      return;
    }

    this.#fieldsByRef = newFieldsByRef;
    this.#notify();
  }

  // ==== query methods ====

  resolve(ref: Ref): RefWithFields {
    const fields = new Map<symbol, any>();
    this.#resolveFields(ref, fields);

    return ref.withFields(fields);
  }

  #resolveFields(ref: Ref, combinedFields: Map<symbol, any>) {
    const fields = this.#fieldsByRef.get(ref);
    if (!fields) {
      return;
    }

    for (const [key, value] of fields.entries()) {
      combinedFields.set(key, value);
    }

    for (const context of this.#subcontexts) {
      context.#resolveFields(ref, combinedFields);
    }
  }

  getAll(): RefWithFields[] {
    const fieldsByRef = new Map<Ref, Map<symbol, any>>();

    this.#resolveAll(fieldsByRef);

    return Array.from(fieldsByRef.entries()).map(([ref, fields]) =>
      ref.withFields(fields)
    );
  }

  #resolveAll(fieldsByRef: Map<Ref, Map<symbol, any>>) {
    for (const [ref, fields] of this.#fieldsByRef.entries()) {
      let combinedFields = fieldsByRef.get(ref);
      if (!combinedFields) {
        combinedFields = new Map();
        fieldsByRef.set(ref, combinedFields);
      }

      for (const [key, value] of fields.entries()) {
        combinedFields.set(key, value);
      }
    }

    for (const context of this.#subcontexts) {
      context.#resolveAll(fieldsByRef);
    }
  }

  getAllWith<Type extends symbol>(field: FieldType<Type, any>) {
    return this.getAll().filter((ref) =>
      ref.has(field)
    ) as unknown as RefWithFields<Type>[];
  }

  // ==== subscription methods ====

  #notify = () => {
    this.#subscribers.forEach((subscriber) => subscriber());
  };

  subscribe(fn: () => void) {
    this.#subscribers.add(fn);
  }

  unsubscribe(fn: () => void) {
    this.#subscribers.delete(fn);
  }

  // ==== subcontext methods ====

  subcontext(): Context {
    const subcontext = new Context();
    subcontext.subscribe(this.#notify);
    return subcontext;
  }

  remove(context: Context) {
    context.unsubscribe(this.#notify);
  }
}

const addTo = (
  fieldsByRef: Map<Ref, Map<symbol, any>>,
  ref: Ref | Ref[] | RefWithFields | RefWithFields[]
) => {
  if (ref instanceof Ref) {
    if (!fieldsByRef.has(ref)) {
      fieldsByRef.set(ref, new Map());
    }
  } else if (ref instanceof RefWithFields) {
    let fields = fieldsByRef.get(ref.ref);
    if (!fields) {
      fields = new Map();
      fieldsByRef.set(ref.ref, fields);
    }

    for (const [fieldType, fieldValue] of ref.fields) {
      fields.set(fieldType, fieldValue);
    }
  } else if (Array.isArray(ref)) {
    for (const item of ref) {
      addTo(fieldsByRef, item);
    }
  }
};

const isEqual = (a: FieldsByRef, b: FieldsByRef) => {
  if (a.size !== b.size) {
    return false;
  }

  for (const [ref, fieldsA] of a.entries()) {
    const fieldsB = b.get(ref);
    if (!fieldsB || fieldsA.size !== fieldsB.size) {
      return false;
    }

    for (const [fieldType, fieldValueA] of fieldsA.entries()) {
      const fieldValueB = fieldsB.get(fieldType);
      if (!deepEqual(fieldValueA, fieldValueB)) {
        return false;
      }
    }
  }

  return true;
};
