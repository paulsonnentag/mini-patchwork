import { FieldType } from "./fields";
import { Ref } from "./refs";

export class Context {
  #subscribers = new Set<() => void>();
  #objRefsById = new Map<string, Ref>();
  #fieldsByObjId = new Map<string, Map<symbol, any>>();

  // mutations

  replace(value: Ref | Ref[]) {
    this.#objRefsById = new Map();
    this.#fieldsByObjId = new Map();
    this.#add(value);
    this.#notify();
  }

  add(value: Ref | Ref[]) {
    this.#add(value);
    this.#notify();
  }

  #add(value: Ref | Ref[]) {
    if (Array.isArray(value)) {
      for (const item of value) {
        this.#add(item);
      }
      return;
    }

    const id = value.toId();
    this.#objRefsById.set(id, value);

    let fields = this.#fieldsByObjId.get(id);
    if (!fields) {
      fields = new Map();
      this.#fieldsByObjId.set(id, fields);
    }

    value.fields.forEach(([fieldType, fieldValue]) => {
      fields.set(fieldType, fieldValue);
    });
  }

  // queries

  resolve(ref: Ref): Ref {
    const id = ref.toId();
    const fields = this.#fieldsByObjId.get(id) ?? new Map();
    return ref.clone().withFields(fields);
  }

  getAll(): Ref[] {
    return Array.from(this.#objRefsById.values()).map((ref) =>
      this.resolve(ref)
    );
  }

  getAllWith<Type extends symbol>(field: FieldType<Type, any>) {
    return this.getAll().filter((ref) => ref.has(field)) as Ref<{
      Fields: Type;
    }>[];
  }

  // subscriptions

  #notify() {
    this.#subscribers.forEach((subscriber) => subscriber());
  }

  subscribe(fn: () => void) {
    this.#subscribers.add(fn);
  }

  unsubscribe(fn: () => void) {
    this.#subscribers.delete(fn);
  }
}
