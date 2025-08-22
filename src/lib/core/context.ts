import { Repo } from "@automerge/react";
import { defineField, Field, FieldType } from "./fields";
import { ObjRef } from "./objRefs";

type Transaction = {
  additionsByObject: Map<string, number>;
  fieldAdditions: Map<string, Map<Function, Field[]>>;
};

export class Context {
  #objectRefs = new Map<string, number>();
  #keyToRef = new Map<string, ObjRef>();
  #fields = new Map<string, Map<Function, Field[]>>();
  #subscribers = new Set<() => void>();

  // --- private helpers ---
  #notify() {
    this.#subscribers.forEach((subscriber) => subscriber());
  }

  #ensureRef(key: string, obj: ObjRef) {
    if (!this.#keyToRef.has(key)) this.#keyToRef.set(key, obj);
  }

  #addObject(transaction: Transaction, obj: ObjRef): void {
    const key = obj.toKey();
    const current = this.#objectRefs.get(key) ?? 0;
    this.#objectRefs.set(key, current + 1);
    this.#ensureRef(key, obj);
    transaction.additionsByObject.set(
      key,
      (transaction.additionsByObject.get(key) ?? 0) + 1
    );
  }

  #addField(transaction: Transaction, obj: ObjRef, field: Field): void {
    const key = obj.toKey();
    let byType = this.#fields.get(key);
    if (!byType) {
      byType = new Map();
      this.#fields.set(key, byType);
    }
    const typeKey = field.type as Function;
    let list = byType.get(typeKey);
    if (!list) {
      list = [];
      byType.set(typeKey, list);
    }
    list.push(field);

    let addedByType = transaction.fieldAdditions.get(key);
    if (!addedByType) {
      addedByType = new Map();
      transaction.fieldAdditions.set(key, addedByType);
    }
    let addedList = addedByType.get(typeKey);
    if (!addedList) {
      addedList = [];
      addedByType.set(typeKey, addedList);
    }
    addedList.push(field);
  }

  #retract(transaction: Transaction) {
    // retract fields
    for (const [key, byType] of transaction.fieldAdditions.entries()) {
      const existingByType = this.#fields.get(key);
      if (!existingByType) continue;
      for (const [typeKey, addedList] of byType.entries()) {
        const existingList = existingByType.get(typeKey);
        if (!existingList) continue;
        for (const field of addedList) {
          const idx = existingList.lastIndexOf(field);
          if (idx !== -1) existingList.splice(idx, 1);
        }
        if (existingList.length === 0) existingByType.delete(typeKey);
      }
      if (existingByType.size === 0) this.#fields.delete(key);
    }

    // retract object counts
    for (const [key, addedCount] of transaction.additionsByObject.entries()) {
      const current = this.#objectRefs.get(key) ?? 0;
      const next = current - addedCount;
      if (next > 0) {
        this.#objectRefs.set(key, next);
      } else {
        this.#objectRefs.delete(key);
        this.#keyToRef.delete(key);
      }
    }
  }

  getField<T>(obj: ObjRef, fieldType: FieldType<T>): T | undefined {
    const key = obj.toKey();
    const byType = this.#fields.get(key);
    if (!byType) return undefined;
    const list = byType.get(fieldType);
    if (!list || list.length === 0) return undefined;
    const last = list[list.length - 1] as Field<T>;
    return last.value;
  }

  getAllObjRefs(): ObjRef[] {
    const result: ObjRef[] = [];
    for (const [key, count] of this.#objectRefs.entries()) {
      if (count > 0) {
        const ref = this.#keyToRef.get(key);
        if (ref) result.push(ref);
      }
    }
    return result;
  }

  onChange(fn: () => void): () => void {
    this.#subscribers.add(fn);

    return () => {
      this.#subscribers.delete(fn);
    };
  }

  // return function that retracts the changes
  change(fn: (context: MutableContext) => void): () => void {
    const transaction = {
      additionsByObject: new Map<string, number>(),
      fieldAdditions: new Map<string, Map<Function, Field[]>>(),
    };

    const mutableContext = new MutableContext(
      (obj: ObjRef) => this.#addObject(transaction, obj),
      (obj: ObjRef, field: Field) => this.#addField(transaction, obj, field)
    );

    fn(mutableContext);

    this.#notify();

    return () => {
      this.#retract(transaction);
      this.#notify();
    };
  }
}

export class MutableContext {
  #addObject: (obj: ObjRef) => void;
  #addField: (obj: ObjRef, field: Field) => void;
  constructor(
    addObject: (obj: ObjRef) => void,
    addField: (obj: ObjRef, field: Field) => void
  ) {
    this.#addObject = addObject;
    this.#addField = addField;
  }

  add(obj: ObjRef): MutableObjectContext {
    this.#addObject(obj);

    return new MutableObjectContext((field: Field) => {
      this.#addField(obj, field);
    });
  }
}

export class MutableObjectContext {
  #addField: (field: Field) => void;

  constructor(addField: (field: Field) => void) {
    this.#addField = addField;
  }

  with(field: Field): MutableObjectContext {
    this.#addField(field);
    return this;
  }
}
