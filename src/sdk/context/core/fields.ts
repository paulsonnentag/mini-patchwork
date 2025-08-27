export class Field<T = unknown> {
  constructor(readonly value: T, readonly type: Function) {}

  isA(type: Function): boolean {
    return type === this.type;
  }
}

export type FieldType<T = unknown> = {
  (value: T): Field<T>;
  fieldName: string;
};

export const defineField = <T>(fieldName: string): FieldType<T> => {
  const constructor: FieldType<T> = (value: T) => {
    return new Field(value, constructor);
  };

  constructor.fieldName = fieldName;

  return constructor;
};
