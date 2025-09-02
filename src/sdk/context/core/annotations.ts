import { Field, FieldType } from "./fields";
import { ObjRef } from "./objRefs";

export class Annotation {
  constructor(
    readonly objRef: ObjRef,
    readonly fields: Map<FieldType<any>, any>
  ) {}

  value() {
    return this.objRef.value;
  }

  get<T>(type: FieldType<T>): T {
    return this.fields.get(type);
  }

  with<T>(field: Field<T>): Annotation {
    return new Annotation(
      this.objRef,
      new Map([...this.fields, [field.type, field.value]])
    );
  }
}
