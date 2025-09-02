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

  get<T>(field: FieldType<T>): T {
    return this.fields.get(field);
  }

  with<T>(field: Field<T>): Annotation {
    return new Annotation(
      this.objRef,
      new Map([...this.fields, [field.type, field.value]])
    );
  }
}
