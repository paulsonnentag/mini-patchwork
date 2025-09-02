import { TodoDataType, TodoDataTypeTemplate } from "../packages/todo";
import { DataType, DataTypeTemplate, PatchworkDoc } from "../sdk/types";

export const DATA_TYPES: DataType<any>[] = [/*MarkdownDataType,*/ TodoDataType];

export const DATA_TYPE_TEMPLATES: DataTypeTemplate<any>[] = [
  /*  MarkdownTemplate,
  EmbarkTemplate,*/
  TodoDataTypeTemplate,
];

export const getDataType = (doc: PatchworkDoc) => {
  return DATA_TYPES.find((dataType) => dataType.id === doc["@patchwork"].type);
};
