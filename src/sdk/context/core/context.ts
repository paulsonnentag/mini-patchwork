import { deepEqual } from "../../../lib/deepEqual";
import { Annotation } from "./annotations";
import { Field, FieldType } from "./fields";
import { ObjRef, TextSpanRef } from "./objRefs";

export class Context {
  #objectRefs = new Map<string, number>();
  idToObjRef = new Map<string, ObjRef>();
  #fieldsByObjId = new Map<string, Map<FieldType<any>, any[]>>();
  #subscribers = new Set<() => void>();

  getAllObjRefs(): ObjRef[] {
    return Array.from(this.idToObjRef.values());
  }

  change(changeFn: ChangeFn): Transaction {
    const state = this.#change(changeFn);
    return new Transaction(this.#retract, this.#change, state);
  }

  transaction(): Transaction {
    return new Transaction(this.#retract, this.#change);
  }

  #notify() {
    this.#subscribers.forEach((subscriber) => subscriber());
  }

  #retract(transactionState: TransactionState) {}

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

    for (const objRef of newState.objRefs) {
    }

    for (const annotation of newState.annotations) {
    }
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
