import { deepEqual } from "../../../lib/deepEqual";
import { Annotation } from "./annotations";
import { FieldType } from "./fields";
import { ObjRef } from "./objRefs";

export class Context {
  #objectRefCountById = new Map<string, number>();
  #objectRefsById = new Map<string, ObjRef>();
  #fieldsByObjId = new Map<string, Map<FieldType<any>, any[]>>();
  #subscribers = new Set<() => void>();

  getAll(): Annotation[] {
    return Array.from(this.#objectRefsById.values()).map(
      (objRef) => new Annotation(objRef, new Map())
    );
  }

  getAllWith(field: FieldType<any>): Annotation[] {
    return Array.from(this.#objectRefsById.values()).flatMap((objRef) => {
      const fields = this.#fieldsByObjId.get(objRef.toId());
      if (!fields) return [];
      const values = fields.get(field);
      if (!values) return [];

      // for now just pick first
      const first = values[0];

      return new Annotation(objRef, new Map([[field, first]]));
    });
  }

  change(changeFn: ChangeFn): Transaction {
    const state = this.#change(changeFn);
    return new Transaction(
      this.#retract.bind(this),
      this.#change.bind(this),
      state
    );
  }

  transaction(): Transaction {
    return new Transaction(this.#retract.bind(this), this.#change.bind(this), {
      objRefs: [],
      annotations: [],
    });
  }

  #notify() {
    this.#subscribers.forEach((subscriber) => subscriber());
  }

  #retract(transactionState: TransactionState) {
    // Decrement reference counts for object refs; remove when count reaches zero
    for (const objRef of transactionState.objRefs) {
      const id = objRef.toId();
      const currentCount = this.#objectRefCountById.get(id) ?? 0;
      if (currentCount <= 1) {
        this.#objectRefCountById.delete(id);
        this.#objectRefsById.delete(id);
      } else {
        this.#objectRefCountById.set(id, currentCount - 1);
      }
    }

    // Retract annotations: remove a single matching value per field; remove field if empty
    for (const annotation of transactionState.annotations) {
      const objId = annotation.objRef.toId();
      const fieldsForObj = this.#fieldsByObjId.get(objId);
      if (!fieldsForObj) continue;

      for (const [fieldType, fieldValue] of annotation.fields.entries()) {
        const values = fieldsForObj.get(fieldType);
        if (!values) continue;

        const index = values.findIndex((v) => deepEqual(v, fieldValue));
        if (index !== -1) {
          values.splice(index, 1);
        }

        if (values.length === 0) {
          fieldsForObj.delete(fieldType);
        }
      }

      if (fieldsForObj.size === 0) {
        this.#fieldsByObjId.delete(objId);
      }
    }

    this.#notify();
  }

  #add(
    value: ObjRef | Annotation | (ObjRef | Annotation)[],
    state: TransactionState
  ) {
    if (value instanceof ObjRef) {
      state.objRefs.push(value);
    } else if (value instanceof Annotation) {
      state.annotations.push(value);
    } else {
      for (const item of value) {
        this.#add(item, state);
      }
    }
  }

  #change(changeFn: ChangeFn, prevState?: TransactionState): TransactionState {
    const newState: TransactionState = {
      objRefs: [],
      annotations: [],
    };

    changeFn((value) => this.#add(value, newState));

    if (prevState && isStateEqual(prevState, newState)) {
      return prevState;
    }

    if (prevState) {
      this.#retract(prevState);
    }

    // Apply new object refs with reference counting
    for (const objRef of newState.objRefs) {
      const id = objRef.toId();
      const currentCount = this.#objectRefCountById.get(id) ?? 0;
      this.#objectRefCountById.set(id, currentCount + 1);
      // Ensure we remember the latest ObjRef for this id
      this.#objectRefsById.set(id, objRef);
    }

    // Apply annotations: aggregate all values per field per object
    for (const annotation of newState.annotations) {
      const objId = annotation.objRef.toId();
      // Ensure we remember the ObjRef for this object id
      this.#objectRefsById.set(objId, annotation.objRef);

      let fieldsForObj = this.#fieldsByObjId.get(objId);
      if (!fieldsForObj) {
        fieldsForObj = new Map();
        this.#fieldsByObjId.set(objId, fieldsForObj);
      }

      for (const [fieldType, fieldValue] of annotation.fields.entries()) {
        let values = fieldsForObj.get(fieldType);
        if (!values) {
          values = [];
          fieldsForObj.set(fieldType, values);
        }
        // Add value as a separate entry (allow duplicates across annotations)
        values.push(fieldValue);
      }
    }

    this.#notify();

    return newState;
  }

  subscribe(fn: () => void): () => void {
    this.#subscribers.add(fn);

    return () => {
      this.#subscribers.delete(fn);
    };
  }

  unsubscribe(fn: () => void): void {
    this.#subscribers.delete(fn);
  }
}

type TransactionState = {
  objRefs: ObjRef[];
  annotations: Annotation[];
};

type ChangeFn = (
  add: (value: ObjRef | Annotation | (ObjRef | Annotation)[]) => void
) => void;

class Transaction {
  #state: TransactionState;
  #retract: (state: TransactionState) => void;
  #change: (
    changeFn: ChangeFn,
    prevState: TransactionState
  ) => TransactionState;

  constructor(
    retract: (transaction: TransactionState) => void,
    update: (
      changeFn: ChangeFn,
      prevState: TransactionState
    ) => TransactionState,
    state: TransactionState
  ) {
    this.#state = state;
    this.#retract = retract;
    this.#change = update;
  }

  retract() {
    this.#retract(this.#state);
  }

  change(changeFn: ChangeFn) {
    this.#state = this.#change(changeFn, this.#state);
  }
}

const isStateEqual = (a: TransactionState, b: TransactionState): boolean => {
  if (
    a.objRefs.length !== b.objRefs.length ||
    a.annotations.length !== b.annotations.length
  ) {
    return false;
  }

  // check if objRefs are equal
  for (let i = 0; i < a.objRefs.length; i++) {
    if (a.objRefs[i].toId() !== b.objRefs[i].toId()) {
      return false;
    }
  }

  // check if annotations are equal
  for (let i = 0; i < a.annotations.length; i++) {
    const aTotalFields = a.annotations[i].fields.size;
    const bTotalFields = b.annotations[i].fields.size;

    if (aTotalFields !== bTotalFields) {
      return false;
    }

    const aEntries = Array.from(a.annotations[i].fields.entries());
    const bEntries = Array.from(b.annotations[i].fields.entries());

    for (let j = 0; j < aTotalFields; j++) {
      const [aFieldType, aFieldValue] = aEntries[j];
      const [bFieldType, bFieldValue] = bEntries[j];

      if (aFieldType !== bFieldType) {
        return false;
      }

      if (deepEqual(aFieldValue, bFieldValue)) {
        return false;
      }
    }
  }

  return true;
};
