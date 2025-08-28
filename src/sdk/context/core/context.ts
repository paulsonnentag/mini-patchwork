import { Field, FieldType } from "./fields";
import { TextSpanRef, type ObjRef } from "./objRefs";

type Transaction = {
  addedObjIds: Set<string>;
  addedFieldsByObjId: Map<string, Field[]>;
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

    if (transaction.addedObjIds.has(key)) {
      return;
    }

    // add object to transaction
    const currentCount = this.#objectRefs.get(key) ?? 0;
    this.#objectRefs.set(key, currentCount + 1);
    transaction.addedObjIds.add(key);

    if (this.#keyToRef.has(key)) {
      return;
    }

    // add object to stored map
    this.#keyToRef.set(key, obj);
  }

  #addField(transaction: Transaction, obj: ObjRef, field: Field): void {
    const objId = obj.toKey();
    let byType = this.#fields.get(objId);
    if (!byType) {
      byType = new Map();
      this.#fields.set(objId, byType);
    }

    const type = field.type as FieldType<any>;
    let list = byType.get(type);
    if (!list) {
      list = [];
      byType.set(type, list);
    }
    list.push(field.value);

    let addedFields = transaction.addedFieldsByObjId.get(objId);
    if (!addedFields) {
      addedFields = [];
      transaction.addedFieldsByObjId.set(objId, addedFields);
    }
    addedFields.push(field);
  }

  #retract(transaction: Transaction) {
    // retract objects
    for (const objId of transaction.addedObjIds.values()) {
      const count = this.#objectRefs.get(objId);
      if (!count) {
        continue;
      }

      const next = count - 1;
      if (next > 0) {
        this.#objectRefs.set(objId, next);
      } else {
        this.#objectRefs.delete(objId);
        this.#keyToRef.delete(objId);
        this.#fields.delete(objId);
      }
    }

    // retract fields
    for (const [
      objId,
      addedFields,
    ] of transaction.addedFieldsByObjId.entries()) {
      const objFieldsByType = this.#fields.get(objId);
      if (!objFieldsByType) continue;

      for (const field of addedFields) {
        const objFieldValues = objFieldsByType.get(field.type);

        if (!objFieldValues) {
          return;
        }

        const indexToDelete = objFieldValues.findIndex(
          (otherField) => otherField === field
        );
        objFieldValues.splice(indexToDelete, 1);

        if (objFieldValues.length === 0) {
          objFieldsByType.delete(field.type);
        }
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

  getAllObjRefKeys(): Set<string> {
    return new Set(this.#keyToRef.keys());
  }

  onChange(fn: () => void): () => void {
    this.#subscribers.add(fn);

    return () => {
      this.#subscribers.delete(fn);
    };
  }

  offChange(fn: () => void): void {
    this.#subscribers.delete(fn);
  }

  dump(): Array<[unknown, string, unknown]> {
    const result: Array<[unknown, string, unknown]> = [];
    for (const [key, byType] of this.#fields.entries()) {
      const ref = this.#keyToRef.get(key);
      for (const [fieldType, list] of byType.entries()) {
        const fieldName = fieldType.fieldName;
        for (const value of list) {
          result.push([
            `${ref?.path.join(".")}${
              ref instanceof TextSpanRef ? `[${ref.from}:${ref.to}]` : ""
            }`,
            fieldName,
            value,
          ]);
        }
      }
    }
    return result;
  }

  // return function that retracts the changes
  change(fn: (context: MutableContext) => void): () => void {
    const transaction: Transaction = {
      addedObjIds: new Set(),
      addedFieldsByObjId: new Map<string, Field[]>(),
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

  with(field: Field<any>): MutableObjectContext {
    this.#addField(field);
    return this;
  }
}
