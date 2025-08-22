export class Field<T = unknown> {
  constructor(readonly value: T, readonly type: Function) {}

  isA(type: Function): boolean {
    return type === this.type;
  }
}

export type FieldType<T> = {
  (value: T): Field<T>;
};

export const defineField = <T>(): FieldType<T> => {
  const constructor: FieldType<T> = (value: T) => {
    return new Field(value, constructor);
  };

  return constructor;
};
