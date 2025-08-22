import type { Repo } from "@automerge/react";
import { defineField, Field, FieldType } from "./fields";
import type { ObjRef } from "./objRefs";

type Transaction = {
  additionsByObject: Map<string, number>;
  fieldAdditions: Map<string, Map<FieldType<any>, any[]>>;
};

export class Context {
  #objectRefs = new Map<string, number>();
  #keyToRef = new Map<string, ObjRef>();
  #fields = new Map<string, Map<FieldType<any>, any[]>>();
  #subscribers = new Set<() => void>();

  #notify() {
    this.#subscribers.forEach((subscriber) => subscriber());
  }

  #addObject(transaction: Transaction, obj: ObjRef): void {
    const key = obj.toKey();
    const current = this.#objectRefs.get(key) ?? 0;
    this.#objectRefs.set(key, current + 1);
    if (!this.#keyToRef.has(key)) {
      this.#keyToRef.set(key, obj);
    }
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
    const typeKey = field.type as FieldType<any>;
    let list = byType.get(typeKey);
    if (!list) {
      list = [];
      byType.set(typeKey, list);
    }
    list.push(field.value);

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
    addedList.push(field.value);
  }

  #retract(transaction: Transaction) {
    // retract fields
    for (const [key, byType] of transaction.fieldAdditions.entries()) {
      const existingByType = this.#fields.get(key);
      if (!existingByType) continue;
      for (const [typeKey, addedList] of byType.entries()) {
        const existingList = existingByType.get(typeKey);
        if (!existingList) continue;
        for (const value of addedList) {
          const idx = existingList.lastIndexOf(value);
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
    return list[0]; // just return the first one for now
  }

  getAllObjRefs(): ObjRef[] {
    return Array.from(this.#keyToRef.values());
  }

  onChange(fn: () => void): () => void {
    this.#subscribers.add(fn);

    return () => {
      this.#subscribers.delete(fn);
    };
  }

  dump(): Array<[unknown, string, unknown]> {
    const result: Array<[unknown, string, unknown]> = [];
    for (const [key, byType] of this.#fields.entries()) {
      const ref = this.#keyToRef.get(key);
      const objValue = ref ? ref.value : undefined;
      for (const [fieldType, list] of byType.entries()) {
        const fieldName = fieldType.fieldName;
        for (const value of list) {
          result.push([objValue, fieldName, value]);
        }
      }
    }
    return result;
  }

  // return function that retracts the changes
  change(fn: (context: MutableContext) => void): () => void {
    const transaction = {
      additionsByObject: new Map<string, number>(),
      fieldAdditions: new Map<string, Map<FieldType<any>, any[]>>(),
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
